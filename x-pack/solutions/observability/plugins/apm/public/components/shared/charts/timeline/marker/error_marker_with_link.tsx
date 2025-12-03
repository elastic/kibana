/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ErrorMarker } from './error_marker';
import { TRACE_ID, TRANSACTION_ID } from '../../../../../../common/es_fields/apm';
import { useAnyOfApmParams } from '../../../../../hooks/use_apm_params';
import type { ErrorMark } from '../../../../app/transaction_details/waterfall_with_summary/waterfall_container/marks/get_error_marks';

export function ErrorMarkerWithLink({ mark }: { mark: ErrorMark }) {
  const { query } = useAnyOfApmParams(
    '/services/{serviceName}/overview',
    '/services/{serviceName}/errors',
    '/services/{serviceName}/transactions/view',
    '/mobile-services/{serviceName}/overview',
    '/mobile-services/{serviceName}/transactions/view',
    '/mobile-services/{serviceName}/errors-and-crashes',
    '/traces/explorer/waterfall',
    '/dependencies/operation'
  );

  const serviceGroup = 'serviceGroup' in query ? query.serviceGroup : '';

  const queryParam = {
    ...query,
    serviceGroup,
    kuery: [
      ...(mark.error.trace?.id ? [`${TRACE_ID} : "${mark.error.trace?.id}"`] : []),
      ...(mark.error.transaction?.id
        ? [`${TRANSACTION_ID} : "${mark.error.transaction?.id}"`]
        : []),
    ].join(' and '),
  };

  return <ErrorMarker mark={mark} query={queryParam} />;
}
