/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export enum CREATE_STATUS {
  INITIAL = 'initial',
  CREATED = 'created',
  FAILED = 'failed',
}

export interface AgentPolicyCreateState {
  status: CREATE_STATUS;
  errorMessage?: JSX.Element;
}

interface Props {
  createState: AgentPolicyCreateState;
}

export const AgentPolicyCreatedCallOut: React.FunctionComponent<Props> = ({ createState }) => {
  return (
    <>
      <EuiSpacer size="m" />
      {createState.status === CREATE_STATUS.CREATED ? (
        <EuiCallOut
          data-test-subj="agentPolicyCreateStatusCallOut"
          title={
            <FormattedMessage
              id="xpack.fleet.agentPolicyCreation.created"
              defaultMessage="Agent policy created"
            />
          }
          color="success"
          iconType="check"
        />
      ) : (
        <EuiCallOut
          data-test-subj="agentPolicyCreateStatusCallOut"
          title={
            <FormattedMessage
              id="xpack.fleet.agentPolicyCreation.failed"
              defaultMessage="Agent policy creation failed"
            />
          }
          color="danger"
          iconType="cross"
        >
          {createState.errorMessage ?? null}
        </EuiCallOut>
      )}
    </>
  );
};
