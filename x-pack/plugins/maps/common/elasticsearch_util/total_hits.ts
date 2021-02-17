/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

interface TotalHits {
  value: number;
  relation: 'eq' | 'gte';
}

export function isTotalHitsGreaterThan(totalHits: TotalHits, value: number) {
  if (totalHits.relation === 'eq') {
    return totalHits.value > value;
  }

  if (value > totalHits.value) {
    throw new Error(
      i18n.translate('xpack.maps.totalHits.lowerBoundPrecisionExceeded', {
        defaultMessage: `Unable to determine if total hits is greater than value. Total hits value precision is lower then value. Total hits: {totalHitsString}, value: {value}.`,
        values: {
          totalHitsString: JSON.stringify(totalHits, null, ''),
          value,
        },
      })
    );
  }

  return totalHits.value >= value;
}
