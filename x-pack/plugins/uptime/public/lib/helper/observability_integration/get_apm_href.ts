/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { LatestMonitor } from '../../../../common/graphql/types';

export const getApmHref = (
  monitor: LatestMonitor,
  basePath: string,
  dateRangeStart: string,
  dateRangeEnd: string
) =>
  `${basePath && basePath.length ? `/${basePath}` : ''}/app/apm#/services?kuery=${encodeURI(
    `url.domain: "${get(monitor, 'ping.url.domain')}"`
  )}&rangeFrom=${dateRangeStart}&rangeTo=${dateRangeEnd}`;
