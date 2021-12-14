/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiEmptyPrompt, EuiPageTemplate } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

export const PolicyHostIsolationExceptionsEmptyUnexisting = ({
  toHostIsolationList,
}: {
  toHostIsolationList: string;
}) => {
  return (
    <EuiPageTemplate template="centeredContent">
      <EuiEmptyPrompt
        iconType="plusInCircle"
        data-test-subj="policy-host-isolation-exceptions-empty-unexisting"
        title={
          <h2>
            <FormattedMessage
              id="xpack.securitySolution.endpoint.policy.hostIsolationExceptions.empty.unexisting.title"
              defaultMessage="No host isolation exceptions exist"
            />
          </h2>
        }
        body={
          <FormattedMessage
            id="xpack.securitySolution.endpoint.policy.hostIsolationExceptions.empty.unexisting.content"
            defaultMessage="There are currently no host isolation exceptions applied to your endpoints."
          />
        }
        actions={
          <EuiButton color="primary" fill href={toHostIsolationList}>
            <FormattedMessage
              id="xpack.securitySolution.endpoint.policy.hostIsolationExceptions.empty.unexisting.action"
              defaultMessage="Add host isolation exceptions"
            />
          </EuiButton>
        }
      />
    </EuiPageTemplate>
  );
};

PolicyHostIsolationExceptionsEmptyUnexisting.displayName =
  'PolicyHostIsolationExceptionsEmptyUnexisting';
