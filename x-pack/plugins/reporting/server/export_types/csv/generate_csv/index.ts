/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { IUiSettingsClient } from 'src/core/server';
import { getFieldFormats } from '../../../services';
import { ReportingConfig } from '../../../';
import { CancellationToken } from '../../../../../../plugins/reporting/common';
import { CSV_BOM_CHARS } from '../../../../common/constants';
import { LevelLogger } from '../../../lib';
import { IndexPatternSavedObject, SavedSearchGeneratorResult } from '../types';
import { checkIfRowsHaveFormulas } from './check_cells_for_formulas';
import { createEscapeValue } from './escape_value';
import { fieldFormatMapFactory } from './field_format_map';
import { createFlattenHit } from './flatten_hit';
import { createFormatCsvValues } from './format_csv_values';
import { getUiSettings } from './get_ui_settings';
import { createHitIterator, EndpointCaller } from './hit_iterator';
import { MaxSizeStringBuilder } from './max_size_string_builder';

interface SearchRequest {
  index: string;
  body:
    | {
        _source: { excludes: string[]; includes: string[] };
        docvalue_fields: string[];
        query: { bool: { filter: any[]; must_not: any[]; should: any[]; must: any[] } } | any;
        script_fields: any;
        sort: Array<{ [key: string]: { order: string } }>;
        stored_fields: string[];
      }
    | any;
}

export interface GenerateCsvParams {
  jobParams: {
    browserTimezone: string;
  };
  searchRequest: SearchRequest;
  indexPatternSavedObject: IndexPatternSavedObject;
  fields: string[];
  metaFields: string[];
  conflictedTypesFields: string[];
}

export function createGenerateCsv(logger: LevelLogger) {
  const hitIterator = createHitIterator(logger);

  return async function generateCsv(
    job: GenerateCsvParams,
    config: ReportingConfig,
    uiSettingsClient: IUiSettingsClient,
    callEndpoint: EndpointCaller,
    cancellationToken: CancellationToken
  ): Promise<SavedSearchGeneratorResult> {
    const settings = await getUiSettings(
      job.jobParams?.browserTimezone,
      uiSettingsClient,
      config,
      logger
    );
    const escapeValue = createEscapeValue(settings.quoteValues, settings.escapeFormulaValues);
    const bom = config.get('csv', 'useByteOrderMarkEncoding') ? CSV_BOM_CHARS : '';
    const builder = new MaxSizeStringBuilder(settings.maxSizeBytes, bom);

    const { fields, metaFields, conflictedTypesFields } = job;
    const header = `${fields.map(escapeValue).join(settings.separator)}\n`;
    const warnings: string[] = [];

    if (!builder.tryAppend(header)) {
      return {
        size: 0,
        content: '',
        maxSizeReached: true,
        warnings: [],
      };
    }

    const iterator = hitIterator(
      settings.scroll,
      callEndpoint,
      job.searchRequest,
      cancellationToken
    );
    let maxSizeReached = false;
    let csvContainsFormulas = false;

    const flattenHit = createFlattenHit(fields, metaFields, conflictedTypesFields);
    const formatsMap = await getFieldFormats()
      .fieldFormatServiceFactory(uiSettingsClient)
      .then((fieldFormats) =>
        fieldFormatMapFactory(job.indexPatternSavedObject, fieldFormats, settings.timezone)
      );

    const formatCsvValues = createFormatCsvValues(
      escapeValue,
      settings.separator,
      fields,
      formatsMap
    );
    try {
      while (true) {
        const { done, value: hit } = await iterator.next();

        if (!hit) {
          break;
        }

        if (done) {
          break;
        }

        const flattened = flattenHit(hit);
        const rows = formatCsvValues(flattened);
        const rowsHaveFormulas =
          settings.checkForFormulas && checkIfRowsHaveFormulas(flattened, fields);

        if (rowsHaveFormulas) {
          csvContainsFormulas = true;
        }

        if (!builder.tryAppend(rows + '\n')) {
          logger.warn('max Size Reached');
          maxSizeReached = true;
          if (cancellationToken) {
            cancellationToken.cancel();
          }
          break;
        }
      }
    } finally {
      await iterator.return();
    }
    const size = builder.getSizeInBytes();
    logger.debug(`finished generating, total size in bytes: ${size}`);

    if (csvContainsFormulas && settings.escapeFormulaValues) {
      warnings.push(
        i18n.translate('xpack.reporting.exportTypes.csv.generateCsv.escapedFormulaValues', {
          defaultMessage: 'CSV may contain formulas whose values have been escaped',
        })
      );
    }

    return {
      content: builder.getString(),
      csvContainsFormulas: csvContainsFormulas && !settings.escapeFormulaValues,
      maxSizeReached,
      size,
      warnings,
    };
  };
}
