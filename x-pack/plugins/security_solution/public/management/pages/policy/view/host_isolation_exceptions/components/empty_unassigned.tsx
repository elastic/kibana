/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiEmptyPrompt, EuiLink, EuiPageTemplate } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { APP_UI_ID } from '../../../../../../../common/constants';
import { useAppUrl } from '../../../../../../common/lib/kibana';
import { getHostIsolationExceptionsListPath } from '../../../../../common/routing';
import { useUserPrivileges } from '../../../../../../common/components/user_privileges';

export const PolicyHostIsolationExceptionsEmptyUnassigned = ({
  policyName,
}: {
  policyName: string;
}) => {
  const { canIsolateHost } = useUserPrivileges().endpointPrivileges;
  const { getAppUrl } = useAppUrl();
  const toHostIsolationList = getAppUrl({
    appId: APP_UI_ID,
    path: getHostIsolationExceptionsListPath(),
  });
  const onClickPrimaryButtonHandler = () => {
    // TODO button handler to assign
    // WIP
  };
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
            values={{ policyName }}
          />
        }
        actions={[
          ...(canIsolateHost
            ? [
                <EuiButton
                  color="primary"
                  fill
                  onClick={onClickPrimaryButtonHandler}
                  data-test-subj="assign-ta-button"
                >
                  <FormattedMessage
                    id="xpack.securitySolution.endpoint.policy.hostIsolationExceptions.empty.unassigned.primaryAction"
                    defaultMessage="Assign host isolation exceptions"
                  />
                </EuiButton>,
              ]
            : []),
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
