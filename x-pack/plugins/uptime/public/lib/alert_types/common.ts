/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { stringify } from 'querystring';

export const format = ({
  pathname,
  query,
}: {
  pathname: string;
  query: Record<string, any>;
}): string => {
  return `${pathname}?${stringify(query)}`;
};

export const getMonitorRouteFromMonitorId = ({
  monitorId,
  dateRangeStart,
  dateRangeEnd,
  filters = {},
}: {
  monitorId: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  filters?: Record<string, string[]>;
}) =>
  format({
    pathname: `/app/uptime/monitor/${btoa(monitorId)}`,
    query: {
      dateRangeEnd,
      dateRangeStart,
      ...(Object.keys(filters).length
        ? { filters: JSON.stringify(Object.keys(filters).map((key) => [key, filters[key]])) }
        : {}),
    },
  });

export const getUrlForAlert = (id: string, basePath: string) => {
  return basePath + '/app/management/insightsAndAlerting/triggersActions/alert/' + id;
};
