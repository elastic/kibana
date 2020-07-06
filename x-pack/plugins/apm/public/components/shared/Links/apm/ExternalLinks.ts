/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import url from 'url';

export const getTraceUrl = ({
  traceId,
  rangeFrom,
  rangeTo,
}: {
  traceId: string;
  rangeFrom: string;
  rangeTo: string;
}) => {
  return url.format({
    pathname: `/link-to/trace/${traceId}`,
    query: { rangeFrom, rangeTo },
  });
};
