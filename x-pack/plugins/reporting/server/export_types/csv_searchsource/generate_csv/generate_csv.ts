/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { SearchResponse } from 'elasticsearch';
import { IScopedClusterClient, IUiSettingsClient } from 'src/core/server';
import { Datatable } from 'src/plugins/expressions/server';
import { ReportingConfig } from '../../..';
import {
  EsQuerySearchAfter,
  FieldFormat,
  FieldFormatConfig,
  IFieldFormatsRegistry,
  ISearchStartSearchSource,
  SearchFieldValue,
  tabifyDocs,
} from '../../../../../../../src/plugins/data/common';
import { CancellationToken } from '../../../../common';
import { CONTENT_TYPE_CSV } from '../../../../common/constants';
import { byteSizeValueToNumber } from '../../../../common/schema_utils';
import { LevelLogger } from '../../../lib';
import { TaskRunResult } from '../../../lib/tasks';
import { JobParamsCSV } from '../types';
import { cellHasFormulas } from './cell_has_formula';
import { CsvExportSettings, getExportSettings } from './get_export_settings';
import { MaxSizeStringBuilder } from './max_size_string_builder';

export class CsvGenerator {
  private _columnMap: number[] | null = null;
  private _formatters: Record<string, FieldFormat> | null = null;
  private csvContainsFormulas = false;
  private maxSizeReached = false;
  private needsSorting = false;
  private csvRowCount = 0;

  constructor(
    private job: JobParamsCSV,
    private config: ReportingConfig,
    private esClient: IScopedClusterClient,
    private uiSettingsClient: IUiSettingsClient,
    private searchSourceService: ISearchStartSearchSource,
    private fieldFormatsRegistry: IFieldFormatsRegistry,
    private cancellationToken: CancellationToken,
    private logger: LevelLogger
  ) {}

  /*
   * Build a map for ordering the fields of search results into CSV columns
   */
  private getColumnMap(fields: SearchFieldValue[] | undefined, table: Datatable) {
    if (this._columnMap) {
      return this._columnMap;
    }

    // if there are selected fields, re-initialize columnMap with field order is set in searchSource fields
    if (fields && fields[0] !== '*') {
      this._columnMap = fields.map((field) =>
        table.columns.findIndex((column) => column.id === field)
      );
    }

    // initialize default columnMap, works if fields are asterisk and order doesn't matter
    if (!this._columnMap) {
      this._columnMap = table.columns.map((c, columnIndex) => columnIndex);
    }

    return this._columnMap;
  }

  /*
   * Load field formats for each field in the list
   */
  private getFormatters(table: Datatable) {
    if (this._formatters) {
      return this._formatters;
    }

    // initialize field formats
    const formatters: Record<string, FieldFormat> = {};
    table.columns.forEach((c) => {
      const fieldFormat = this.fieldFormatsRegistry.deserialize(c.meta.params);
      formatters[c.id] = fieldFormat;
    });

    this._formatters = formatters;
    return this._formatters;
  }

  /*
   * Use the list of fields to generate the header row
   */
  private generateHeader(
    fields: SearchFieldValue[] | undefined,
    table: Datatable,
    builder: MaxSizeStringBuilder,
    settings: CsvExportSettings
  ) {
    const { checkForFormulas, escapeValue, separator } = settings;
    const columnMap = this.getColumnMap(fields, table);

    this.logger.debug(`Building CSV header row...`);
    const header =
      columnMap
        .map((columnIndex, position) => {
          let value: string;
          if (columnIndex > -1) {
            value = table.columns[columnIndex].name;
          } else {
            value = fields && fields[position] ? (fields[position] as string) : 'unknown';
          }

          if (checkForFormulas && cellHasFormulas(value)) {
            this.csvContainsFormulas = true; // set warning if heading value has a formula
          }

          return escapeValue(value);
        })
        .join(separator) + `\n`;

    if (!builder.tryAppend(header)) {
      return {
        size: 0,
        content: '',
        maxSizeReached: true,
        warnings: [],
      };
    }
  }

  /*
   * Format a Datatable into rows of CSV content
   */
  private generateRows(
    fields: SearchFieldValue[] | undefined,
    table: Datatable,
    builder: MaxSizeStringBuilder,
    formatters: Record<string, FieldFormat>,
    settings: CsvExportSettings
  ) {
    // write the rows
    this.logger.debug(`Building ${table.rows.length} CSV data rows...`);
    const { checkForFormulas, escapeValue, separator } = settings;

    for (const dataTableRow of table.rows) {
      if (this.cancellationToken.isCancelled()) {
        break;
      }

      const columnMap = this.getColumnMap(fields, table);
      const row =
        columnMap
          .map((columnIndex, position) => {
            const tableColumn = table.columns[columnIndex];
            let cell: string[] | string = '-';

            if (tableColumn != null) {
              cell = formatters[tableColumn.id].convert(dataTableRow[tableColumn.id]);

              try {
                // expected values are a string of JSON where the value(s) is in an array
                cell = JSON.parse(cell);
              } catch (e) {
                // ignore
              }

              // We have to strip singular array values out of their array wrapper,
              // So that the value appears the visually the same as seen in Discover
              if (Array.isArray(cell)) {
                cell = cell.join(', '); // mimic Discover behavior
              }
            } else {
              this.logger.warn(`Unrecognized field: ${(fields && fields[position]) || 'unknown'}`);
            }

            return cell;
          })
          .map((value) => {
            if (checkForFormulas && cellHasFormulas(value)) {
              this.csvContainsFormulas = true; // set warning if cell value has a formula
            }
            // Escape the values in Data
            return escapeValue(value);
          })
          .join(separator) + '\n';

      if (!builder.tryAppend(row)) {
        this.logger.warn('max Size Reached');
        this.maxSizeReached = true;
        if (this.cancellationToken) {
          this.cancellationToken.cancel();
        }
        break;
      }

      this.csvRowCount++;
    }
  }

  /*
   * Open a Point In Time on the Elasticsearch index and collect all the data from the index
   */
  public async generateData(): Promise<TaskRunResult> {
    const [settings, searchSource] = await Promise.all([
      getExportSettings(this.uiSettingsClient, this.config, this.job.browserTimezone, this.logger),
      this.searchSourceService.create(this.job.searchSource),
    ]);

    const index = searchSource.getField('index');
    const fields = searchSource.getField('fields');

    const { maxSizeBytes, bom, escapeFormulaValues } = settings;
    searchSource.setField('size', settings.scroll.size);

    const builder = new MaxSizeStringBuilder(byteSizeValueToNumber(maxSizeBytes), bom);

    let currentRecord = -1;
    let totalRecords = 0;
    let first = true;
    let lastSortId: EsQuerySearchAfter | undefined;
    let pitId: string | undefined;
    const warnings: string[] = [];

    // open PIT and set field format config
    if (index) {
      // use _pit API
      const { title: indexPatternTitle } = index;
      const { duration } = settings.scroll;
      this.logger.debug(`Open PIT: index: '${indexPatternTitle}' keep_alive: '${duration}'`);
      const { body, statusCode } = await this.esClient.asCurrentUser.openPointInTime({
        index: indexPatternTitle,
        keep_alive: duration,
      });
      if (statusCode === 404) {
        this.logger.error('Unable to open point in time!');
        this.logger.error(new Error(JSON.stringify(body)));
      }
      pitId = body.id as string;

      // apply timezone from the job to all date field formatters
      try {
        index.fields.getByType('date').forEach(({ name }) => {
          this.logger.debug(`setting timezone on ${name}`);
          const format: FieldFormatConfig = {
            ...index.fieldFormatMap[name],
            id: index.fieldFormatMap[name]?.id || 'date', // allow id: date_nanos
            params: {
              ...index.fieldFormatMap[name]?.params,
              timezone: settings.timezone,
            },
          };
          index.setFieldFormat(name, format);
        });
      } catch (err) {
        this.logger.error(err);
      }
    }

    this.logger.debug(`Received PIT ID: ${pitId?.substring(0, 9)}`);
    if (pitId) {
      searchSource.setField('pit', { id: pitId, keep_alive: '2m' });
    } else {
      this.logger.error(`Unable to open a point in time with ${searchSource.getId()}!`);
    }

    do {
      if (this.cancellationToken.isCancelled()) {
        break;
      }

      if (lastSortId) {
        searchSource.setField('searchAfter', lastSortId);
      }
      let results: SearchResponse<unknown> | undefined;
      try {
        results = await searchSource.fetch();
      } catch (err) {
        this.logger.error(err);
      }

      if (!results) {
        break;
      }

      if (results.hits?.total == null) {
        this.logger.error('Expected total number of records in the search response');
        totalRecords = -1;
      } else {
        totalRecords = results.hits.total;
      }
      this.logger.debug(`Search results: ${totalRecords}`);

      let table: Datatable | undefined;
      try {
        table = tabifyDocs(results, index, { shallow: true, meta: true });
      } catch (err) {
        this.logger.error(err);
      }

      if (!table) {
        break;
      }

      // write the header and initialize formatters / column orderings
      // depends on the table to know what order to place the columns
      if (first) {
        first = false;
        this.generateHeader(fields, table, builder, settings);
      }

      if (table.rows.length < 1) {
        break; // empty report with just the header
      }

      const formatters = this.getFormatters(table);
      this.generateRows(fields, table, builder, formatters, settings);

      const hits = results.hits?.hits || [];

      let tempSortId: EsQuerySearchAfter | undefined;
      try {
        tempSortId = hits[hits.length - 1]?.sort as EsQuerySearchAfter;
        if (lastSortId && tempSortId?.join() === lastSortId?.join()) {
          // repeated sort ID: results are not thoroughly sorted
          this.needsSorting = true;
        }

        const uniqueSortIds = new Set<string | undefined>();
        hits.forEach((hit) => {
          uniqueSortIds.add(hit.sort?.join());
        });
        if (lastSortId && (!uniqueSortIds.size || uniqueSortIds.size < hits.length)) {
          // not enough unique sort IDs for the number of hits: results are not thoroughly sorted
          this.needsSorting = true;
        }
      } catch (err) {
        this.logger.error(err);
      }

      // update last sort ID for next query
      lastSortId = tempSortId;

      // update iterator
      currentRecord += table.rows.length;
    } while (currentRecord < totalRecords - 1);

    const size = builder.getSizeInBytes();
    this.logger.debug(
      `Finished generating. Total size in bytes: ${size}. Row count: ${this.csvRowCount}.`
    );

    // the row count is wrong and it's not because of max size limit
    // results are not thoroughly sorted
    if (this.csvRowCount !== totalRecords && !this.maxSizeReached) {
      this.needsSorting = true;
    }

    // Add warnings to be logged
    if (this.csvContainsFormulas && escapeFormulaValues) {
      warnings.push(
        i18n.translate('xpack.reporting.exportTypes.csv.generateCsv.escapedFormulaValues', {
          defaultMessage: 'CSV may contain formulas whose values have been escaped',
        })
      );
    }

    if (this.needsSorting) {
      warnings.push(
        i18n.translate('xpack.reporting.exportTypes.csv.generateCsv.unsortedResults', {
          defaultMessage: `The export may have duplicated or missing data: sort values in the search results must be unique`,
        })
      );
    }

    // clean PIT
    if (pitId) {
      this.logger.debug(`Closing PIT`);
      await this.esClient.asCurrentUser.closePointInTime({ body: { id: pitId } });
    }

    return {
      content: builder.getString(),
      content_type: CONTENT_TYPE_CSV,
      csv_contains_formulas: this.csvContainsFormulas && !escapeFormulaValues,
      max_size_reached: this.maxSizeReached,
      needs_sorting: this.needsSorting,
      size,
      warnings,
    };
  }
}
