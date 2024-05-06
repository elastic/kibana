/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  KpiHistogramData,
  KpiGeneralHistogramCount,
  KpiHistogram,
} from '../../../../../common/search_strategy';

export const formatGeneralHistogramData = (
  data: Array<KpiHistogram<KpiGeneralHistogramCount>>
): KpiHistogramData[] | null =>
  data && data.length > 0
    ? data.map<KpiHistogramData>(({ key, count }) => ({
        x: key,
        y: count.doc_count ?? count.value,
      }))
    : null;
