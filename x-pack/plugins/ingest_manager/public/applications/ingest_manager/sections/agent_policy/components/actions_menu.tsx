/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo, useState, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiContextMenuItem, EuiPortal } from '@elastic/eui';
import { AgentPolicy } from '../../../types';
import { useCapabilities } from '../../../hooks';
import { ContextMenuActions } from '../../../components';
import { AgentEnrollmentFlyout } from '../../fleet/components';
import { AgentPolicyYamlFlyout } from './agent_policy_yaml_flyout';
import { AgentPolicyCopyProvider } from './agent_policy_copy_provider';

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
    const hasWriteCapabilities = useCapabilities().write;
    const [isYamlFlyoutOpen, setIsYamlFlyoutOpen] = useState<boolean>(false);
    const [isEnrollmentFlyoutOpen, setIsEnrollmentFlyoutOpen] = useState<boolean>(
      enrollmentFlyoutOpenByDefault
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
          return (
            <>
              {isYamlFlyoutOpen ? (
                <EuiPortal>
                  <AgentPolicyYamlFlyout
                    policyId={agentPolicy.id}
                    onClose={() => setIsYamlFlyoutOpen(false)}
                  />
                </EuiPortal>
              ) : null}
              {isEnrollmentFlyoutOpen && (
                <EuiPortal>
                  <AgentEnrollmentFlyout agentPolicies={[agentPolicy]} onClose={onClose} />
                </EuiPortal>
              )}
              <ContextMenuActions
                button={
                  fullButton
                    ? {
                        props: {
                          iconType: 'arrowDown',
                          iconSide: 'right',
                        },
                        children: (
                          <FormattedMessage
                            id="xpack.ingestManager.agentPolicyActionMenu.buttonText"
                            defaultMessage="Actions"
                          />
                        ),
                      }
                    : undefined
                }
                items={[
                  <EuiContextMenuItem
                    disabled={!hasWriteCapabilities}
                    icon="plusInCircle"
                    onClick={() => setIsEnrollmentFlyoutOpen(true)}
                    key="enrollAgents"
                  >
                    <FormattedMessage
                      id="xpack.ingestManager.agentPolicyActionMenu.enrollAgentActionText"
                      defaultMessage="Add agent"
                    />
                  </EuiContextMenuItem>,
                  <EuiContextMenuItem
                    icon="inspect"
                    onClick={() => setIsYamlFlyoutOpen(!isYamlFlyoutOpen)}
                    key="viewPolicy"
                  >
                    <FormattedMessage
                      id="xpack.ingestManager.agentPolicyActionMenu.viewPolicyText"
                      defaultMessage="View policy"
                    />
                  </EuiContextMenuItem>,
                  <EuiContextMenuItem
                    disabled={!hasWriteCapabilities}
                    icon="copy"
                    onClick={() => {
                      copyAgentPolicyPrompt(agentPolicy, onCopySuccess);
                    }}
                    key="copyPolicy"
                  >
                    <FormattedMessage
                      id="xpack.ingestManager.agentPolicyActionMenu.copyPolicyActionText"
                      defaultMessage="Copy policy"
                    />
                  </EuiContextMenuItem>,
                ]}
              />
            </>
          );
        }}
      </AgentPolicyCopyProvider>
    );
  }
);
