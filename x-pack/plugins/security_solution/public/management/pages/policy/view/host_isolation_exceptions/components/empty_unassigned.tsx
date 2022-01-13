/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiEmptyPrompt, EuiLink, EuiPageTemplate } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { getPolicyHostIsolationExceptionsPath } from '../../../../../common/routing';
import { PolicyData } from '../../../../../../../common/endpoint/types';

export const PolicyHostIsolationExceptionsEmptyUnassigned = ({
  policy,
  toHostIsolationList,
}: {
  policy: PolicyData;
  toHostIsolationList: string;
}) => {
  const history = useHistory();

  const onClickPrimaryButtonHandler = () =>
    history.push(
      getPolicyHostIsolationExceptionsPath(policy.id, {
        ...location,
        show: 'list',
      })
    );
  return (
    <EuiPageTemplate template="centeredContent">
      <EuiEmptyPrompt
        iconType="plusInCircle"
        data-test-subj="policy-host-isolation-exceptions-empty-unassigned"
        title={
          <h2>
            <FormattedMessage
              id="xpack.securitySolution.endpoint.policy.hostIsolationExceptions.empty.unassigned.title"
              defaultMessage="No assigned host isolation exceptions"
            />
          </h2>
        }
        body={
          <FormattedMessage
            id="xpack.securitySolution.endpoint.policy.hostIsolationExceptions.empty.unassigned.content"
            defaultMessage="There are currently no host isolation exceptions assigned to {policyName}. Assign exceptions now or add and manage them on the host isolation exceptions page."
            values={{ policyName: policy.name }}
          />
        }
        actions={[
          <EuiButton
            color="primary"
            fill
            onClick={onClickPrimaryButtonHandler}
            data-test-subj="empty-assign-host-isolation-exceptions-button"
          >
            <FormattedMessage
              id="xpack.securitySolution.endpoint.policy.hostIsolationExceptions.empty.unassigned.primaryAction"
              defaultMessage="Assign host isolation exceptions"
            />
          </EuiButton>,
          <EuiLink href={toHostIsolationList}>
            <FormattedMessage
              id="xpack.securitySolution.endpoint.policy.hostIsolationExceptions.empty.unassigned.secondaryAction"
              defaultMessage="Manage host isolation exceptions"
            />
          </EuiLink>,
        ]}
      />
    </EuiPageTemplate>
  );
};

PolicyHostIsolationExceptionsEmptyUnassigned.displayName =
  'PolicyHostIsolationExceptionsEmptyUnassigned';
