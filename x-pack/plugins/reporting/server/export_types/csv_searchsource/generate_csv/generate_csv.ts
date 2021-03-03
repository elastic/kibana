/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { SearchResponse } from 'elasticsearch';
import { IScopedClusterClient, IUiSettingsClient } from 'src/core/server';
import { IScopedSearchClient } from 'src/plugins/data/server';
import { Datatable } from 'src/plugins/expressions/server';
import { ReportingConfig } from '../../..';
import {
  ES_SEARCH_STRATEGY,
  FieldFormat,
  FieldFormatConfig,
  IFieldFormatsRegistry,
  ISearchSource,
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
  private csvRowCount = 0;

  constructor(
    private job: JobParamsCSV,
    private config: ReportingConfig,
    private esClient: IScopedClusterClient,
    private data: IScopedSearchClient,
    private uiSettingsClient: IUiSettingsClient,
    private searchSourceService: ISearchStartSearchSource,
    private fieldFormatsRegistry: IFieldFormatsRegistry,
    private cancellationToken: CancellationToken,
    private logger: LevelLogger
  ) {}

  private async search(searchSource: ISearchSource, scrollSettings: CsvExportSettings['scroll']) {
    const { body: searchBody, index: searchIndex } = searchSource.flatten();
    this.logger.debug(`executing search request`);
    const searchParams = {
      params: {
        body: searchBody,
        index: searchIndex.title,
        scroll: scrollSettings.duration,
        size: scrollSettings.size,
      },
    };
    const results = (
      await this.data.search(searchParams, { strategy: ES_SEARCH_STRATEGY }).toPromise()
    ).rawResponse;

    return results;
  }

  private async scroll(scrollId: string, scrollSettings: CsvExportSettings['scroll']) {
    this.logger.debug(`executing scroll request`);
    const results = (
      await this.esClient.asCurrentUser.scroll({
        scroll: scrollSettings.duration,
        scroll_id: scrollId,
      })
    ).body as SearchResponse<unknown>;
    return results;
  }

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

  public async generateData(): Promise<TaskRunResult> {
    const [settings, searchSource] = await Promise.all([
      getExportSettings(this.uiSettingsClient, this.config, this.job.browserTimezone, this.logger),
      this.searchSourceService.create(this.job.searchSource),
    ]);

    const index = searchSource.getField('index');
    const fields = searchSource.getField('fields');

    const { maxSizeBytes, bom, escapeFormulaValues, scroll: scrollSettings } = settings;

    const builder = new MaxSizeStringBuilder(byteSizeValueToNumber(maxSizeBytes), bom);
    const warnings: string[] = [];
    let first = true;
    let currentRecord = -1;
    let totalRecords = 0;
    let scrollId: string | undefined;

    if (index) {
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

    do {
      if (this.cancellationToken.isCancelled()) {
        break;
      }
      let results: SearchResponse<unknown> | undefined;
      try {
        if (scrollId == null) {
          // open a scroll cursor in Elasticsearch
          results = await this.search(searchSource, scrollSettings);
          scrollId = results._scroll_id;
          if (results.hits?.total != null) {
            totalRecords = results.hits.total;
            this.logger.debug(`Total search results: ${totalRecords}`);
          }
        } else {
          // use the scroll cursor in Elasticsearch
          results = await this.scroll(scrollId, scrollSettings);
        }
      } catch (err) {
        this.logger.error(err);
      }

      if (!results) {
        this.logger.warning(`Search results are undefined!`);
        break;
      }

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

      // update iterator
      currentRecord += table.rows.length;
    } while (currentRecord < totalRecords - 1);

    const size = builder.getSizeInBytes();
    this.logger.debug(
      `Finished generating. Total size in bytes: ${size}. Row count: ${this.csvRowCount}.`
    );

    // Add warnings to be logged
    if (this.csvContainsFormulas && escapeFormulaValues) {
      warnings.push(
        i18n.translate('xpack.reporting.exportTypes.csv.generateCsv.escapedFormulaValues', {
          defaultMessage: 'CSV may contain formulas whose values have been escaped',
        })
      );
    }

    // clear scrollID
    if (scrollId) {
      this.logger.debug(`executing clearScroll request`);
      try {
        await this.esClient.asCurrentUser.clearScroll({ scroll_id: [scrollId] });
      } catch (err) {
        this.logger.error(err);
      }
    } else {
      this.logger.warn(`No scrollId to clear!`);
    }

    return {
      content: builder.getString(),
      content_type: CONTENT_TYPE_CSV,
      csv_contains_formulas: this.csvContainsFormulas && !escapeFormulaValues,
      max_size_reached: this.maxSizeReached,
      size,
      warnings,
    };
  }
}
