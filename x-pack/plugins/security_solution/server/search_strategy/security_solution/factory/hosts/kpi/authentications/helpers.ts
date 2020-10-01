/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  HostsKpiHistogram,
  HostsKpiAuthenticationsHistogramCount,
  HostsKpiHistogramData,
} from '../../../../../../../common/search_strategy';

export const formatAuthenticationsHistogramData = (
  data: Array<HostsKpiHistogram<HostsKpiAuthenticationsHistogramCount>>
): HostsKpiHistogramData[] | null =>
  data && data.length > 0
    ? data.map<HostsKpiHistogramData>(({ key, count }) => ({
        x: key,
        y: count.doc_count,
      }))
    : null;
