/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const formatAuthenticationsHistogramData = (
  data: Array<KpiHostHistogram<KpiHostAuthHistogramCount>>
): KpiHostHistogramData[] | null =>
  data && data.length > 0
    ? data.map<KpiHostHistogramData>(({ key, count }) => ({
        x: key,
        y: count.doc_count,
      }))
    : null;
