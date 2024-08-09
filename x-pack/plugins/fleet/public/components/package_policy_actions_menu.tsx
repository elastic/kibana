/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiContextMenuItem, EuiPortal } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { AgentPolicy, InMemoryPackagePolicy } from '../types';
import { useAgentPolicyRefresh, useAuthz, useLink, useStartServices } from '../hooks';
import { policyHasFleetServer } from '../services';

import { PLUGIN_ID, pagePathGetters } from '../constants';

import { AgentEnrollmentFlyout } from './agent_enrollment_flyout';
import { ContextMenuActions } from './context_menu_actions';
import { DangerEuiContextMenuItem } from './danger_eui_context_menu_item';
import { PackagePolicyDeleteProvider } from './package_policy_delete_provider';

export const PackagePolicyActionsMenu: React.FunctionComponent<{
  agentPolicies: AgentPolicy[];
  packagePolicy: InMemoryPackagePolicy;
  showAddAgent?: boolean;
  defaultIsOpen?: boolean;
  upgradePackagePolicyHref?: string;
  from?: 'fleet-policy-list' | undefined;
}> = ({
  agentPolicies,
  packagePolicy,
  showAddAgent,
  upgradePackagePolicyHref,
  defaultIsOpen = false,
  from,
}) => {
  const [isEnrollmentFlyoutOpen, setIsEnrollmentFlyoutOpen] = useState(false);
  const { getHref } = useLink();
  const authz = useAuthz();
  const {
    application: { navigateToApp },
  } = useStartServices();

  const agentPolicy = agentPolicies.length > 0 ? agentPolicies[0] : undefined; // TODO: handle multiple agent policies
  const canWriteIntegrationPolicies = authz.integrations.writeIntegrationPolicies;
  const isFleetServerPolicy = agentPolicy && policyHasFleetServer(agentPolicy);

  const canAddAgents = isFleetServerPolicy ? authz.fleet.addFleetServers : authz.fleet.addAgents;
  const refreshAgentPolicy = useAgentPolicyRefresh();
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(defaultIsOpen);

  const isManaged = Boolean(packagePolicy.is_managed);
  const agentPolicyIsManaged = Boolean(agentPolicy?.is_managed);

  const isAddAgentVisible = showAddAgent && agentPolicy && !agentPolicyIsManaged;

  const onEnrollmentFlyoutClose = useMemo(() => {
    return () => setIsEnrollmentFlyoutOpen(false);
  }, []);
  const menuItems = [
    // FIXME: implement View package policy action
    // <EuiContextMenuItem
    //   disabled
    //   icon="inspect"
    //   onClick={() => {}}
    //   key="packagePolicyView"
    // >
    //   <FormattedMessage
    //     id="xpack.fleet.policyDetails.packagePoliciesTable.viewActionTitle"
    //     defaultMessage="View integration"
    //   />
    // </EuiContextMenuItem>,
    ...(isAddAgentVisible
      ? [
          <EuiContextMenuItem
            data-test-subj="PackagePolicyActionsAddAgentItem"
            icon="plusInCircle"
            onClick={() => {
              setIsActionsMenuOpen(false);
              setIsEnrollmentFlyoutOpen(true);
            }}
            key="addAgent"
            disabled={!canAddAgents}
          >
            <FormattedMessage
              id="xpack.fleet.epm.packageDetails.integrationList.addAgent"
              defaultMessage="Add agent"
            />
          </EuiContextMenuItem>,
        ]
      : []),
    <EuiContextMenuItem
      data-test-subj="PackagePolicyActionsEditItem"
      disabled={
        !canWriteIntegrationPolicies || !agentPolicy || (agentPolicy?.supports_agentless ?? false)
      }
      icon="pencil"
      href={`${getHref('edit_integration', {
        policyId: agentPolicy?.id ?? '',
        packagePolicyId: packagePolicy.id,
      })}${from ? `?from=${from}` : ''}`}
      key="packagePolicyEdit"
      toolTipContent={
        (agentPolicy?.supports_agentless ?? false) && (
          <FormattedMessage
            id="xpack.fleet.epm.packageDetails.integrationList.editIntegrationAgentlessTooltip"
            defaultMessage="Editing an agentless integration is not supported. Add a new integration if needed."
          />
        )
      }
    >
      <FormattedMessage
        id="xpack.fleet.policyDetails.packagePoliciesTable.editActionTitle"
        defaultMessage="Edit integration"
      />
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      data-test-subj="PackagePolicyActionsUpgradeItem"
      disabled={
        !packagePolicy.hasUpgrade || !canWriteIntegrationPolicies || !upgradePackagePolicyHref
      }
      icon="refresh"
      href={upgradePackagePolicyHref}
      key="packagePolicyUpgrade"
    >
      <FormattedMessage
        id="xpack.fleet.policyDetails.packagePoliciesTable.upgradeActionTitle"
        defaultMessage="Upgrade integration policy"
      />
    </EuiContextMenuItem>,
    // FIXME: implement Copy package policy action
    // <EuiContextMenuItem disabled icon="copy" onClick={() => {}} key="packagePolicyCopy">
    //   <FormattedMessage
    //     id="xpack.fleet.policyDetails.packagePoliciesTable.copyActionTitle"
    //     defaultMessage="Copy integration"
    //   />
    // </EuiContextMenuItem>,
  ];

  if (!agentPolicy || !agentPolicyIsManaged || agentPolicy?.supports_agentless) {
    const ContextMenuItem = canWriteIntegrationPolicies
      ? DangerEuiContextMenuItem
      : EuiContextMenuItem;
    menuItems.push(
      <PackagePolicyDeleteProvider agentPolicies={agentPolicies} key="packagePolicyDelete">
        {(deletePackagePoliciesPrompt) => {
          return (
            <ContextMenuItem
              data-test-subj="PackagePolicyActionsDeleteItem"
              disabled={!canWriteIntegrationPolicies}
              icon="trash"
              onClick={() => {
                deletePackagePoliciesPrompt([packagePolicy.id], () => {
                  setIsActionsMenuOpen(false);
                  if (agentPolicy?.supports_agentless) {
                    // go back to all agent policies
                    navigateToApp(PLUGIN_ID, { path: pagePathGetters.policies_list()[1] });
                  } else {
                    refreshAgentPolicy();
                  }
                });
              }}
            >
              <FormattedMessage
                id="xpack.fleet.policyDetails.packagePoliciesTable.deleteActionTitle"
                defaultMessage="Delete integration"
              />
            </ContextMenuItem>
          );
        }}
      </PackagePolicyDeleteProvider>
    );
  }
  return (
    <>
      {isEnrollmentFlyoutOpen && (
        <EuiPortal>
          <AgentEnrollmentFlyout
            agentPolicy={agentPolicy}
            onClose={onEnrollmentFlyoutClose}
            isIntegrationFlow={true}
            installedPackagePolicy={{
              name: packagePolicy?.package?.name || '',
              version: packagePolicy?.package?.version || '',
            }}
          />
        </EuiPortal>
      )}
      <ContextMenuActions
        isManaged={isManaged}
        isOpen={isActionsMenuOpen}
        items={menuItems}
        onChange={(open) => setIsActionsMenuOpen(open)}
      />
    </>
  );
};
