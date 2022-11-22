/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as esErrors, estypes } from '@elastic/elasticsearch';
import type { IScopedClusterClient, IUiSettingsClient, Logger } from '@kbn/core/server';
import type { ISearchSource, ISearchStartSearchSource } from '@kbn/data-plugin/common';
import { cellHasFormulas, ES_SEARCH_STRATEGY, tabifyDocs } from '@kbn/data-plugin/common';
import type { IScopedSearchClient } from '@kbn/data-plugin/server';
import type { Datatable } from '@kbn/expressions-plugin/server';
import type {
  FieldFormat,
  FieldFormatConfig,
  IFieldFormatsRegistry,
} from '@kbn/field-formats-plugin/common';
import { lastValueFrom } from 'rxjs';
import type { Writable } from 'stream';
import type { CancellationToken } from '../../../../common/cancellation_token';
import { CONTENT_TYPE_CSV } from '../../../../common/constants';
import { AuthenticationExpiredError, ReportingError } from '../../../../common/errors';
import { byteSizeValueToNumber } from '../../../../common/schema_utils';
import { ReportingConfigType } from '../../../config';
import type { TaskRunResult } from '../../../lib/tasks';
import type { JobParamsCSV } from '../types';
import { CsvExportSettings, getExportSettings } from './get_export_settings';
import { i18nTexts } from './i18n_texts';
import { MaxSizeStringBuilder } from './max_size_string_builder';

interface Clients {
  es: IScopedClusterClient;
  data: IScopedSearchClient;
  uiSettings: IUiSettingsClient;
}

interface Dependencies {
  searchSourceStart: ISearchStartSearchSource;
  fieldFormatsRegistry: IFieldFormatsRegistry;
}

export class CsvGenerator {
  private csvContainsFormulas = false;
  private maxSizeReached = false;
  private csvRowCount = 0;

  constructor(
    private job: Omit<JobParamsCSV, 'version'>,
    private config: ReportingConfigType['csv'],
    private clients: Clients,
    private dependencies: Dependencies,
    private cancellationToken: CancellationToken,
    private logger: Logger,
    private stream: Writable
  ) {}

  private async openPointInTime(indexPatternTitle: string, settings: CsvExportSettings) {
    const { duration } = settings.scroll;
    let pitId: string | undefined;
    this.logger.debug(`Requesting PIT for: [${indexPatternTitle}]...`);
    try {
      // NOTE: if ES is overloaded, this request could time out
      const response = await this.clients.es.asCurrentUser.openPointInTime(
        {
          index: indexPatternTitle,
          keep_alive: duration,
          ignore_unavailable: true,
        },
        {
          requestTimeout: duration,
          maxRetries: 0,
        }
      );
      pitId = response.id;
    } catch (err) {
      this.logger.error(err);
    }

    if (!pitId) {
      throw new Error(`Could not receive a PIT ID!`);
    }

    this.logger.debug(`Opened PIT ID: ${this.formatPit(pitId)}`);

    return pitId;
  }

  private async doSearch(
    searchSource: ISearchSource,
    settings: CsvExportSettings,
    searchAfter?: estypes.SortResults
  ) {
    const { scroll: scrollSettings, includeFrozen } = settings;
    searchSource.setField('size', scrollSettings.size);

    if (searchAfter) {
      searchSource.setField('searchAfter', searchAfter);
    }

    const pitId = searchSource.getField('pit')?.id;
    this.logger.debug(
      `Executing search request with PIT ID: [${this.formatPit(pitId)}]` +
        (searchAfter ? ` search_after: [${searchAfter}]` : '')
    );

    const searchBody: estypes.SearchRequest = searchSource.getSearchRequestBody();
    if (searchBody == null) {
      throw new Error('Could not retrieve the search body!');
    }

    const searchParams = {
      params: {
        body: searchBody,
        ignore_throttled: includeFrozen ? false : undefined, // "true" will cause deprecation warnings logged in ES
      },
    };

    let results: estypes.SearchResponse<unknown> | undefined;
    try {
      results = (
        await lastValueFrom(
          this.clients.data.search(searchParams, {
            strategy: ES_SEARCH_STRATEGY,
            transport: {
              maxRetries: 0, // retrying reporting jobs is handled in the task manager scheduling logic
              requestTimeout: scrollSettings.duration,
            },
          })
        )
      ).rawResponse;
    } catch (err) {
      this.logger.error(`CSV export search error: ${err}`);
      throw err;
    }

    return results;
  }

  /*
   * Load field formats for each field in the list
   */
  private getFormatters(table: Datatable) {
    // initialize field formats
    const formatters: Record<string, FieldFormat> = {};
    table.columns.forEach((c) => {
      const fieldFormat = this.dependencies.fieldFormatsRegistry.deserialize(c.meta.params);
      formatters[c.id] = fieldFormat;
    });

    return formatters;
  }

  private escapeValues(settings: CsvExportSettings) {
    return (value: string) => {
      if (settings.checkForFormulas && cellHasFormulas(value)) {
        this.csvContainsFormulas = true; // set warning if cell value has a formula
      }
      return settings.escapeValue(value);
    };
  }

  private getColumnsFromTabify(table: Datatable) {
    const columnIds = table.columns.map((c) => c.id);
    columnIds.sort();
    return columnIds;
  }

  private formatCellValues(formatters: Record<string, FieldFormat>) {
    return ({
      column: tableColumn,
      data: dataTableCell,
    }: {
      column: string;
      data: unknown;
    }): string => {
      let cell: string[] | string | object;
      // check truthiness to guard against _score, _type, etc
      if (tableColumn && dataTableCell) {
        try {
          cell = formatters[tableColumn].convert(dataTableCell);
        } catch (err) {
          this.logger.error(err);
          cell = '-';
        }

        const isIdField = tableColumn === '_id'; // _id field can not be formatted or mutated
        if (!isIdField) {
          try {
            // unwrap the value
            // expected values are a string of JSON where the value(s) is in an array
            // examples: "[""Jan 1, 2020 @ 04:00:00.000""]","[""username""]"
            cell = JSON.parse(cell);
          } catch (e) {
            // ignore
          }
        }

        // We have to strip singular array values out of their array wrapper,
        // So that the value appears the visually the same as seen in Discover
        if (Array.isArray(cell)) {
          cell = cell.map((c) => (typeof c === 'object' ? JSON.stringify(c) : c)).join(', ');
        }

        // Check for object-type value (geoip)
        if (typeof cell === 'object') {
          cell = JSON.stringify(cell);
        }

        return cell;
      }

      return '-'; // Unknown field: it existed in searchSource but has no value in the result
    };
  }

  /*
   * Use the list of columns to generate the header row
   */
  private generateHeader(
    columns: Set<string>,
    builder: MaxSizeStringBuilder,
    settings: CsvExportSettings
  ) {
    this.logger.debug(`Building CSV header row`);
    const header =
      Array.from(columns).map(this.escapeValues(settings)).join(settings.separator) + '\n';

    if (!builder.tryAppend(header)) {
      return {
        content: '',
        maxSizeReached: true,
        warnings: [],
      };
    }
  }

  /*
   * Format a Datatable into rows of CSV content
   */
  private async generateRows(
    columns: Set<string>,
    table: Datatable,
    builder: MaxSizeStringBuilder,
    formatters: Record<string, FieldFormat>,
    settings: CsvExportSettings
  ) {
    this.logger.debug(`Building ${table.rows.length} CSV data rows`);
    for (const dataTableRow of table.rows) {
      if (this.cancellationToken.isCancelled()) {
        break;
      }

      /*
       * Intrinsically, generating the rows is a synchronous process. Awaiting
       * on a setImmediate call here partititions what could be a very long and
       * CPU-intenstive synchronous process into an asychronous process. This
       * give NodeJS to process other asychronous events that wait on the Event
       * Loop.
       *
       * See: https://nodejs.org/en/docs/guides/dont-block-the-event-loop/
       *
       * It's likely this creates a lot of context switching, and adds to the
       * time it would take to generate the CSV. There are alternatives to the
       * chosen performance solution:
       *
       * 1. Partition the synchronous process with fewer partitions, by using
       * the loop counter to call setImmediate only every N amount of rows.
       * Testing is required to see what the best N value for most data will
       * be.
       *
       * 2. Use a C++ add-on to generate the CSV using the Node Worker Pool
       * instead of using the Event Loop
       */
      await new Promise(setImmediate);

      const rowDefinition: string[] = [];
      const format = this.formatCellValues(formatters);
      const escape = this.escapeValues(settings);

      for (const column of columns) {
        rowDefinition.push(escape(format({ column, data: dataTableRow[column] })));
      }

      if (!builder.tryAppend(rowDefinition.join(settings.separator) + '\n')) {
        this.logger.warn(`Max Size Reached after ${this.csvRowCount} rows.`);
        this.maxSizeReached = true;
        if (this.cancellationToken) {
          this.cancellationToken.cancel();
        }
        break;
      }

      this.csvRowCount++;
    }
  }

  public async generateData(): Promise<TaskRunResult> {
    const [settings, searchSource] = await Promise.all([
      getExportSettings(
        this.clients.uiSettings,
        this.config,
        this.job.browserTimezone,
        this.logger
      ),
      this.dependencies.searchSourceStart.create(this.job.searchSource),
    ]);
    let reportingError: undefined | ReportingError;

    const index = searchSource.getField('index');

    if (!index) {
      throw new Error(`The search must have a reference to an index pattern!`);
    }

    const { maxSizeBytes, bom, escapeFormulaValues, timezone } = settings;
    const indexPatternTitle = index.getIndexPattern();
    const builder = new MaxSizeStringBuilder(this.stream, byteSizeValueToNumber(maxSizeBytes), bom);
    const warnings: string[] = [];
    let first = true;
    let currentRecord = -1;
    let totalRecords: number | undefined;
    let totalRelation = 'eq';
    let searchAfter: estypes.SortResults | undefined;

    let pitId = await this.openPointInTime(indexPatternTitle, settings);

    // apply timezone from the job to all date field formatters
    try {
      index.fields.getByType('date').forEach(({ name }) => {
        this.logger.debug(`Setting timezone on ${name}`);
        const format: FieldFormatConfig = {
          ...index.fieldFormatMap[name],
          id: index.fieldFormatMap[name]?.id || 'date', // allow id: date_nanos
          params: {
            ...index.fieldFormatMap[name]?.params,
            timezone,
          },
        };
        index.setFieldFormat(name, format);
      });
    } catch (err) {
      this.logger.error(err);
    }

    const columns = new Set<string>(this.job.columns ?? []);
    try {
      do {
        if (this.cancellationToken.isCancelled()) {
          break;
        }
        // set the latest pit, which could be different from the last request
        searchSource.setField('pit', { id: pitId, keep_alive: settings.scroll.duration });

        const results = await this.doSearch(searchSource, settings, searchAfter);

        const { hits } = results;
        if (first && hits.total != null) {
          if (typeof hits.total === 'number') {
            totalRecords = hits.total;
          } else {
            totalRecords = hits.total?.value;
            totalRelation = hits.total?.relation ?? 'unknown';
          }
          this.logger.info(`Total hits ${totalRelation} ${totalRecords}.`);
        }

        if (!results) {
          this.logger.warn(`Search results are undefined!`);
          break;
        }

        const {
          hits: { hits: _hits, ...hitsMeta },
          ...headerWithPit
        } = results;

        const { pit_id: newPitId, ...header } = headerWithPit;

        const logInfo = {
          header: { pit_id: `${this.formatPit(newPitId)}`, ...header },
          hitsMeta,
        };
        this.logger.debug(`Results metadata: ${JSON.stringify(logInfo)}`);

        // use the most recently received id for the next search request
        this.logger.debug(`Received PIT ID: [${this.formatPit(results.pit_id)}]`);
        pitId = results.pit_id ?? pitId;

        // Update last sort results for next query. PIT is used, so the sort results
        // automatically include _shard_doc as a tiebreaker
        searchAfter = hits.hits[hits.hits.length - 1]?.sort as estypes.SortResults | undefined;
        this.logger.debug(`Received search_after: [${searchAfter}]`);

        // check for shard failures, log them and add a warning if found
        const { _shards: shards } = header;
        if (shards.failures) {
          shards.failures.forEach(({ reason }) => {
            warnings.push(`Shard failure: ${JSON.stringify(reason)}`);
            this.logger.warn(JSON.stringify(reason));
          });
        }

        let table: Datatable | undefined;
        try {
          table = tabifyDocs(results, index, { shallow: true, includeIgnoredValues: true });
        } catch (err) {
          this.logger.error(err);
          warnings.push(i18nTexts.unknownError(err?.message ?? err));
        }

        if (!table) {
          break;
        }

        if (!this.job.columns?.length) {
          this.getColumnsFromTabify(table).forEach((column) => columns.add(column));
        }

        if (first) {
          first = false;
          this.generateHeader(columns, builder, settings);
        }

        if (table.rows.length < 1) {
          break; // empty report with just the header
        }

        // FIXME: make tabifyDocs handle the formatting, to get the same formatting logic as Discover?
        const formatters = this.getFormatters(table);
        await this.generateRows(columns, table, builder, formatters, settings);

        // update iterator
        currentRecord += table.rows.length;
      } while (totalRecords != null && currentRecord < totalRecords - 1);

      // Add warnings to be logged
      if (this.csvContainsFormulas && escapeFormulaValues) {
        warnings.push(i18nTexts.escapedFormulaValuesMessage);
      }
    } catch (err) {
      this.logger.error(err);
      if (err instanceof esErrors.ResponseError) {
        if ([401, 403].includes(err.statusCode ?? 0)) {
          reportingError = new AuthenticationExpiredError();
          warnings.push(i18nTexts.authenticationError.partialResultsMessage);
        } else {
          warnings.push(i18nTexts.esErrorMessage(err.statusCode ?? 0, String(err.body)));
        }
      } else {
        warnings.push(i18nTexts.unknownError(err?.message ?? err));
      }
    }

    try {
      if (pitId) {
        this.logger.debug(`Closing PIT ${this.formatPit(pitId)}`);
        await this.clients.es.asCurrentUser.closePointInTime({ body: { id: pitId } });
      } else {
        this.logger.warn(`No PIT ID to clear!`);
      }
    } catch (err) {
      this.logger.error(err);
      warnings.push(i18nTexts.csvUnableToClosePit());
    }

    this.logger.info(`Finished generating. Row count: ${this.csvRowCount}.`);

    if (!this.maxSizeReached && this.csvRowCount !== totalRecords) {
      this.logger.warn(
        `ES scroll returned fewer total hits than expected! ` +
          `Search result total hits: ${totalRecords}. Row count: ${this.csvRowCount}`
      );
      warnings.push(
        i18nTexts.csvRowCountError({ expected: totalRecords ?? NaN, received: this.csvRowCount })
      );
    }

    return {
      content_type: CONTENT_TYPE_CSV,
      csv_contains_formulas: this.csvContainsFormulas && !escapeFormulaValues,
      max_size_reached: this.maxSizeReached,
      metrics: {
        csv: { rows: this.csvRowCount },
      },
      warnings,
      error_code: reportingError?.code,
    };
  }

  private formatPit(pitId: string | undefined) {
    const byteSize = pitId ? Buffer.byteLength(pitId, 'utf-8') : 0;
    return pitId?.substring(0, 12) + `[${byteSize} bytes]`;
  }
}
