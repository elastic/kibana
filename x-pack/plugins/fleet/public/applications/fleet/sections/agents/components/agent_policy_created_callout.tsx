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

interface Props {
  createStatus: CREATE_STATUS;
}

export const AgentPolicyCreatedCallOut: React.FunctionComponent<Props> = ({ createStatus }) => {
  return (
    <>
      <EuiSpacer size="m" />
      {createStatus === CREATE_STATUS.CREATED ? (
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
        />
      )}
    </>
  );
};
