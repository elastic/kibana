/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { addBasePath } from './add_base_path';
import { MonitorSummary } from '../../../../common/runtime_types';

export const getApmHref = (
  summary: MonitorSummary,
  basePath: string,
  dateRangeStart: string,
  dateRangeEnd: string
) => {
  const clause = summary?.state?.service?.name
    ? `service.name: "${summary.state.service.name}"`
    : `url.domain: "${summary.state.url?.domain}"`;

  return addBasePath(
    basePath,
    `/app/apm#/services?kuery=${encodeURI(
      clause
    )}&rangeFrom=${dateRangeStart}&rangeTo=${dateRangeEnd}`
  );
};
