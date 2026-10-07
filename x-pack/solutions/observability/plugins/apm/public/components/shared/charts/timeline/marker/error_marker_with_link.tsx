/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ErrorMark } from './error_marker';
import { ErrorMarker } from './error_marker';
import { SPAN_ID, TRACE_ID, TRANSACTION_ID } from '../../../../../../common/es_fields/apm';
import { toAnyOfKuery } from '../../../../../../common/utils/kuery_utils';
import { useAnyOfApmParams } from '../../../../../hooks/use_apm_params';

export function ErrorMarkerWithLink({ mark }: { mark: ErrorMark }) {
  const { query } = useAnyOfApmParams(
    '/services/{serviceName}/overview',
    '/services/{serviceName}/errors',
    '/services/{serviceName}/transactions/view',
    '/mobile-services/{serviceName}/overview',
    '/mobile-services/{serviceName}/transactions/view',
    '/mobile-services/{serviceName}/errors-and-crashes',
    '/dependencies/operation'
  );

  const serviceGroup = 'serviceGroup' in query ? query.serviceGroup : '';

  const traceId = mark.error.trace?.id;
  const transactionId = mark.error.transaction?.id;
  const spanId = mark.error.span?.id;

  const kueryParts = [
    traceId && `${TRACE_ID} : "${traceId}"`,
    // OTel-native error documents only carry `span.id`, so fall back to it when the error
    // has no `transaction.id`. Classic-data output stays byte-identical when spanId is absent.
    toAnyOfKuery([
      [TRANSACTION_ID, transactionId],
      [SPAN_ID, spanId],
    ]),
  ].filter(Boolean);

  const queryParam = {
    ...query,
    serviceGroup,
    kuery: kueryParts.join(' and '),
  };

  return <ErrorMarker mark={mark} query={queryParam} />;
}
