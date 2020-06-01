/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { LevelLogger } from '../../../../lib';
import { GenerateCsvParams, SavedSearchGeneratorResult } from '../../types';
import { createFlattenHit } from './flatten_hit';
import { createFormatCsvValues } from './format_csv_values';
import { createEscapeValue } from './escape_value';
import { createHitIterator } from './hit_iterator';
import { MaxSizeStringBuilder } from './max_size_string_builder';
import { checkIfRowsHaveFormulas } from './check_cells_for_formulas';

export function createGenerateCsv(logger: LevelLogger) {
  const hitIterator = createHitIterator(logger);

  return async function generateCsv({
    searchRequest,
    fields,
    formatsMap,
    metaFields,
    conflictedTypesFields,
    callEndpoint,
    cancellationToken,
    settings,
  }: GenerateCsvParams): Promise<SavedSearchGeneratorResult> {
    const escapeValue = createEscapeValue(settings.quoteValues, settings.escapeFormulaValues);
    const builder = new MaxSizeStringBuilder(settings.maxSizeBytes);
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

    const iterator = hitIterator(settings.scroll, callEndpoint, searchRequest, cancellationToken);
    let maxSizeReached = false;
    let csvContainsFormulas = false;

    const flattenHit = createFlattenHit(fields, metaFields, conflictedTypesFields);
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
          cancellationToken.cancel();
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
