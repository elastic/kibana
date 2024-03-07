/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sloSchema } from '@kbn/slo-schema';
import { isLeft } from 'fp-ts/lib/Either';
import { SLO } from '../../../domain/models';
import { EsSummaryDocument } from '../summary_transform_generator/helpers/create_temp_summary';

export function fromSummaryDocumentToSlo(summaryDoc: EsSummaryDocument): SLO | undefined {
  const res = sloSchema.decode({
    ...summaryDoc.slo,
    indicator: {
      type: summaryDoc.slo.indicator.type,
      params: {
        index: 'irrelevant',
        good: 'irrelevant',
        total: 'irrelevant',
        timestampField: 'irrelevant',
      },
    },
    settings: { syncDelay: '1m', frequency: '1m' },
    enabled: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    version: 1,
  });

  if (isLeft(res)) {
    return undefined;
  } else {
    return res.right;
  }
}
