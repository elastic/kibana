/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createFlattenHit } from './flatten_hit';
import { createFormatCsvValues } from './format_csv_values';
import { createEscapeValue } from './escape_value';
import { createHitIterator } from './hit_iterator';
import { MaxSizeStringBuilder } from './max_size_string_builder';

export function createGenerateCsv(logger) {
  const hitIterator = createHitIterator(logger);

  return async function generateCsv({
    searchRequest,
    fields,
    formatsMap,
    metaFields,
    conflictedTypesFields,
    callEndpoint,
    cancellationToken,
    settings
  }) {
    const escapeValue = createEscapeValue(settings.quoteValues);
    const flattenHit = createFlattenHit(fields, metaFields, conflictedTypesFields);
    const formatCsvValues = createFormatCsvValues(escapeValue, settings.separator, fields, formatsMap);

    const builder = new MaxSizeStringBuilder(settings.maxSizeBytes);

    const header = `${fields.map(escapeValue).join(settings.separator)}\n`;
    if (!builder.tryAppend(header)) {
      return {
        content: '',
        maxSizeReached: true
      };
    }

    const iterator = hitIterator(settings.scroll, callEndpoint, searchRequest, cancellationToken);
    let maxSizeReached = false;

    try {
      while (true) {
        const { done, value: hit } = await iterator.next();

        if (done) {
          break;
        }

        if (!builder.tryAppend(formatCsvValues(flattenHit(hit)) + '\n')) {
          logger('max Size Reached');
          maxSizeReached = true;
          cancellationToken.cancel();
          break;
        }
      }
    } finally {
      await iterator.return();
    }

    logger('finished generating');
    return {
      content: builder.getString(),
      maxSizeReached
    };
  };
}
