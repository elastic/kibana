/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { format } from 'url';
import { TRACE_ID } from '../../../../common/elasticsearch_fieldnames';

export const getRedirectToTracePageUrl = ({
  traceId,
  rangeFrom,
  rangeTo,
}: {
  traceId: string;
  rangeFrom?: string;
  rangeTo?: string;
}) =>
  format({
    pathname: `/traces`,
    query: {
      kuery: encodeURIComponent(`${TRACE_ID} : "${traceId}"`),
      rangeFrom,
      rangeTo,
    },
  });
