/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState, useMemo, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiContextMenuItem, EuiPortal } from '@elastic/eui';

import type { AgentPolicy } from '../../../types';
import { useAuthz } from '../../../hooks';
import {
  AgentEnrollmentFlyout,
  ContextMenuActions,
  UninstallCommandFlyout,
} from '../../../components';
import { FLEET_SERVER_PACKAGE } from '../../../constants';

import { policyHasFleetServer, ExperimentalFeaturesService } from '../../../services';

import { AgentPolicyYamlFlyout } from './agent_policy_yaml_flyout';
import { AgentPolicyCopyProvider } from './agent_policy_copy_provider';
import { AgentPolicyDeleteProvider } from './agent_policy_delete_provider';

export const AgentPolicyActionMenu = memo<{
  agentPolicy: AgentPolicy;
  onCopySuccess?: (newAgentPolicy: AgentPolicy) => void;
  fullButton?: boolean;
  enrollmentFlyoutOpenByDefault?: boolean;
  onCancelEnrollment?: () => void;
}>(
  ({
    agentPolicy,
    onCopySuccess,
    fullButton = false,
    enrollmentFlyoutOpenByDefault = false,
    onCancelEnrollment,
  }) => {
    const authz = useAuthz();

    const [isYamlFlyoutOpen, setIsYamlFlyoutOpen] = useState<boolean>(false);
    const [isEnrollmentFlyoutOpen, setIsEnrollmentFlyoutOpen] = useState<boolean>(
      enrollmentFlyoutOpenByDefault
    );
    const [isUninstallCommandFlyoutOpen, setIsUninstallCommandFlyoutOpen] =
      useState<boolean>(false);

    const { agentTamperProtectionEnabled } = ExperimentalFeaturesService.get();

    const isFleetServerPolicy = useMemo(
      () =>
        agentPolicy.package_policies?.some(
          (packagePolicy) => packagePolicy.package?.name === FLEET_SERVER_PACKAGE
        ) ?? false,
      [agentPolicy]
    );

    const hasManagedPackagePolicy =
      'package_policies' in agentPolicy &&
      agentPolicy?.package_policies?.some((packagePolicy) => packagePolicy.is_managed);

    const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);

    const onContextMenuChange = useCallback(
      (open: boolean) => {
        setIsContextMenuOpen(open);
      },
      [setIsContextMenuOpen]
    );

    const onClose = useMemo(() => {
      if (onCancelEnrollment) {
        return onCancelEnrollment;
      } else {
        return () => setIsEnrollmentFlyoutOpen(false);
      }
    }, [onCancelEnrollment, setIsEnrollmentFlyoutOpen]);

    return (
      <AgentPolicyCopyProvider>
        {(copyAgentPolicyPrompt) => {
          const viewPolicyItem = (
            <EuiContextMenuItem
              icon="inspect"
              onClick={() => {
                setIsContextMenuOpen(false);
                setIsYamlFlyoutOpen(!isYamlFlyoutOpen);
              }}
              key="viewPolicy"
            >
              <FormattedMessage
                id="xpack.fleet.agentPolicyActionMenu.viewPolicyText"
                defaultMessage="View policy"
              />
            </EuiContextMenuItem>
          );

          const menuItems = agentPolicy?.is_managed
            ? [viewPolicyItem]
            : [
                <EuiContextMenuItem
                  icon="plusInCircle"
                  disabled={
                    (isFleetServerPolicy && !authz.fleet.addFleetServers) ||
                    (!isFleetServerPolicy && !authz.fleet.addAgents)
                  }
                  data-test-subj="agentPolicyActionMenuAddAgentButton"
                  onClick={() => {
                    setIsContextMenuOpen(false);
                    setIsEnrollmentFlyoutOpen(true);
                  }}
                  key="enrollAgents"
                >
                  {isFleetServerPolicy ? (
                    <FormattedMessage
                      id="xpack.fleet.agentPolicyActionMenu.addFleetServerActionText"
                      defaultMessage="Add Fleet Server"
                    />
                  ) : (
                    <FormattedMessage
                      id="xpack.fleet.agentPolicyActionMenu.enrollAgentActionText"
                      defaultMessage="Add agent"
                    />
                  )}
                </EuiContextMenuItem>,
                viewPolicyItem,
                <EuiContextMenuItem
                  disabled={!authz.integrations.writeIntegrationPolicies}
                  icon="copy"
                  onClick={() => {
                    setIsContextMenuOpen(false);
                    copyAgentPolicyPrompt(agentPolicy, onCopySuccess);
                  }}
                  key="copyPolicy"
                >
                  <FormattedMessage
                    id="xpack.fleet.agentPolicyActionMenu.copyPolicyActionText"
                    defaultMessage="Duplicate policy"
                  />
                </EuiContextMenuItem>,
                <AgentPolicyDeleteProvider
                  hasFleetServer={policyHasFleetServer(agentPolicy as AgentPolicy)}
                  key="deletePolicy"
                  packagePolicies={agentPolicy.package_policies}
                >
                  {(deleteAgentPolicyPrompt) => (
                    <EuiContextMenuItem
                      data-test-subj="agentPolicyActionMenuDeleteButton"
                      disabled={!authz.fleet.allAgentPolicies || hasManagedPackagePolicy}
                      toolTipContent={
                        hasManagedPackagePolicy ? (
                          <FormattedMessage
                            id="xpack.fleet.policyForm.deletePolicyActionText.disabled"
                            defaultMessage="Agent policy with managed package policies cannot be deleted."
                            data-test-subj="agentPolicyActionMenuDeleteButtonDisabledTooltip"
                          />
                        ) : undefined
                      }
                      icon="trash"
                      onClick={() => {
                        deleteAgentPolicyPrompt(agentPolicy.id);
                      }}
                    >
                      <FormattedMessage
                        id="xpack.fleet.agentPolicyActionMenu.deletePolicyActionText"
                        defaultMessage="Delete policy"
                      />
                    </EuiContextMenuItem>
                  )}
                </AgentPolicyDeleteProvider>,
              ];

          if (authz.fleet.allAgents && agentTamperProtectionEnabled && !agentPolicy?.is_managed) {
            menuItems.push(
              <EuiContextMenuItem
                icon="minusInCircle"
                onClick={() => {
                  setIsContextMenuOpen(false);
                  setIsUninstallCommandFlyoutOpen(true);
                }}
                key="getUninstallCommand"
                data-test-subj="uninstall-agents-command-menu-item"
              >
                <FormattedMessage
                  id="xpack.fleet.agentPolicyActionMenu.getUninstallCommand"
                  defaultMessage="Uninstall agents on this policy"
                />
              </EuiContextMenuItem>
            );
          }

          return (
            <>
              {isYamlFlyoutOpen && (
                <EuiPortal>
                  <AgentPolicyYamlFlyout
                    policyId={agentPolicy.id}
                    onClose={() => setIsYamlFlyoutOpen(false)}
                  />
                </EuiPortal>
              )}
              {isEnrollmentFlyoutOpen && (
                <EuiPortal>
                  <AgentEnrollmentFlyout agentPolicy={agentPolicy} onClose={onClose} />
                </EuiPortal>
              )}
              {isUninstallCommandFlyoutOpen && (
                <UninstallCommandFlyout
                  target="agent"
                  policyId={agentPolicy.id}
                  onClose={() => setIsUninstallCommandFlyoutOpen(false)}
                />
              )}
              <ContextMenuActions
                isOpen={isContextMenuOpen}
                onChange={onContextMenuChange}
                button={
                  fullButton
                    ? {
                        props: {
                          iconType: 'arrowDown',
                          iconSide: 'right',
                        },
                        children: (
                          <FormattedMessage
                            id="xpack.fleet.agentPolicyActionMenu.buttonText"
                            defaultMessage="Actions"
                          />
                        ),
                      }
                    : undefined
                }
                items={menuItems}
              />
            </>
          );
        }}
      </AgentPolicyCopyProvider>
    );
  }
);
