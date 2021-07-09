/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, ReactNode } from 'react';
import { EuiCallOut } from '@elastic/eui';
import { GET_ISOLATION_SUCCESS_MESSAGE, GET_UNISOLATION_SUCCESS_MESSAGE } from './translations';

export interface EndpointIsolateSuccessProps {
  hostName: string;
  isolateAction?: 'isolateHost' | 'unisolateHost';
  additionalInfo?: ReactNode;
}

export const EndpointIsolateSuccess = memo<EndpointIsolateSuccessProps>(
  ({ hostName, isolateAction = 'isolateHost', additionalInfo }) => {
    return (
      <EuiCallOut
        iconType="check"
        color="success"
        title={
          isolateAction === 'isolateHost'
            ? GET_ISOLATION_SUCCESS_MESSAGE(hostName)
            : GET_UNISOLATION_SUCCESS_MESSAGE(hostName)
        }
        data-test-subj={
          isolateAction === 'isolateHost'
            ? 'hostIsolateSuccessMessage'
            : 'hostUnisolateSuccessMessage'
        }
      >
        {additionalInfo}
      </EuiCallOut>
    );
  }
);

EndpointIsolateSuccess.displayName = 'EndpointIsolateSuccess';
