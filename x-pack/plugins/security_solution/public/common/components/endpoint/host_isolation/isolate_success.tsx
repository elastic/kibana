/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, ReactNode } from 'react';
import { EuiButtonEmpty, EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { GET_ISOLATION_SUCCESS_MESSAGE, GET_UNISOLATION_SUCCESS_MESSAGE } from './translations';

export interface EndpointIsolateSuccessProps {
  hostName: string;
  isolateAction?: 'isolateHost' | 'unisolateHost';
  completeButtonLabel: string;
  onComplete: () => void;
  additionalInfo?: ReactNode;
}

export const EndpointIsolateSuccess = memo<EndpointIsolateSuccessProps>(
  ({
    hostName,
    isolateAction = 'isolateHost',
    onComplete,
    completeButtonLabel,
    additionalInfo,
  }) => {
    return (
      <>
        {isolateAction === 'isolateHost' ? (
          <EuiCallOut
            iconType="check"
            color="success"
            title={GET_ISOLATION_SUCCESS_MESSAGE(hostName)}
            data-test-subj="hostIsolateSuccessMessage"
          >
            {additionalInfo}
          </EuiCallOut>
        ) : (
          <EuiCallOut
            iconType="check"
            color="success"
            title={GET_UNISOLATION_SUCCESS_MESSAGE(hostName)}
          >
            {additionalInfo}
          </EuiCallOut>
        )}

        <EuiFlexGroup gutterSize="none" justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              flush="right"
              onClick={onComplete}
              data-test-subj="hostIsolateSuccessCompleteButton"
            >
              <EuiText size="s">
                <p>{completeButtonLabel}</p>
              </EuiText>
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  }
);

EndpointIsolateSuccess.displayName = 'EndpointIsolateSuccess';
