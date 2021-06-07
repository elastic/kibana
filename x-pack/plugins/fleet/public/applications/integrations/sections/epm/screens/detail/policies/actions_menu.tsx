/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState, useMemo } from 'react';
import { EuiPortal, EuiContextMenuItem, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import type { AgentPolicy, PackagePolicy } from '../../../../../types';
import {
  AgentEnrollmentFlyout,
  ContextMenuActions,
  DangerEuiContextMenuItem,
  PackagePolicyDeleteProvider,
} from '../../../../../components';
import { useAgentPolicyRefresh, useLink } from '../../../../../hooks';

export const PackagePoliciesActionMenu: React.FunctionComponent<{
  agentPolicy: AgentPolicy;
  packagePolicy: PackagePolicy;
}> = memo(({ agentPolicy, packagePolicy }) => {
  const [isEnrollmentFlyoutOpen, setIsEnrollmentFlyoutOpen] = useState(false);
  const { getHref } = useLink();

  const onClose = useMemo(() => {
    return () => setIsEnrollmentFlyoutOpen(false);
  }, []);

  const refreshAgentPolicy = useAgentPolicyRefresh();

  return (
    <>
      {isEnrollmentFlyoutOpen && (
        <EuiPortal>
          <AgentEnrollmentFlyout agentPolicies={[agentPolicy]} onClose={onClose} />
        </EuiPortal>
      )}

      <ContextMenuActions
        items={[
          <EuiContextMenuItem
            icon="plusInCircle"
            onClick={() => setIsEnrollmentFlyoutOpen(true)}
            key="addAgent"
          >
            <FormattedMessage
              id="xpack.fleet.epm.packageDetails.integrationList.addAgent"
              defaultMessage="Add Agent"
            />
          </EuiContextMenuItem>,
          <EuiContextMenuItem icon="pencil" onClick={() => null} key="editIntegration">
            <EuiLink
              color="text"
              href={getHref('integration_policy_edit', {
                packagePolicyId: packagePolicy.id,
              })}
            >
              <FormattedMessage
                id="xpack.fleet.epm.packageDetails.integrationList.editIntegration"
                defaultMessage="Edit integration"
              />
            </EuiLink>
          </EuiContextMenuItem>,
          <PackagePolicyDeleteProvider agentPolicy={agentPolicy} key="deleteIntegration">
            {(deletePackagePoliciesPrompt) => (
              <DangerEuiContextMenuItem
                icon="trash"
                onClick={() => deletePackagePoliciesPrompt([packagePolicy.id], refreshAgentPolicy)}
                key="deleteIntegration"
              >
                <FormattedMessage
                  id="xpack.fleet.epm.packageDetails.integrationList.deleteIntegration"
                  defaultMessage="Delete integration"
                />
              </DangerEuiContextMenuItem>
            )}
          </PackagePolicyDeleteProvider>,
        ]}
      />
    </>
  );
});
