/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo, useState, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiContextMenuItem, EuiPortal } from '@elastic/eui';
import { AgentConfig } from '../../../types';
import { useCapabilities } from '../../../hooks';
import { ContextMenuActions } from '../../../components';
import { AgentEnrollmentFlyout } from '../../fleet/components';
import { ConfigYamlFlyout } from './config_yaml_flyout';
import { AgentConfigCopyProvider } from './config_copy_provider';

export const AgentConfigActionMenu = memo<{
  config: AgentConfig;
  onCopySuccess?: (newAgentConfig: AgentConfig) => void;
  fullButton?: boolean;
  enrollmentFlyoutOpenByDefault?: boolean;
  onCancelEnrollment?: () => void;
}>(
  ({
    config,
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
      <AgentConfigCopyProvider>
        {(copyAgentConfigPrompt) => {
          return (
            <>
              {isYamlFlyoutOpen ? (
                <EuiPortal>
                  <ConfigYamlFlyout
                    configId={config.id}
                    onClose={() => setIsYamlFlyoutOpen(false)}
                  />
                </EuiPortal>
              ) : null}
              {isEnrollmentFlyoutOpen && (
                <EuiPortal>
                  <AgentEnrollmentFlyout agentConfigs={[config]} onClose={onClose} />
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
                            id="xpack.ingestManager.agentConfigActionMenu.buttonText"
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
                      id="xpack.ingestManager.agentConfigActionMenu.enrollAgentActionText"
                      defaultMessage="Add agent"
                    />
                  </EuiContextMenuItem>,
                  <EuiContextMenuItem
                    icon="inspect"
                    onClick={() => setIsYamlFlyoutOpen(!isYamlFlyoutOpen)}
                    key="viewConfig"
                  >
                    <FormattedMessage
                      id="xpack.ingestManager.agentConfigActionMenu.viewConfigText"
                      defaultMessage="View config"
                    />
                  </EuiContextMenuItem>,
                  <EuiContextMenuItem
                    disabled={!hasWriteCapabilities}
                    icon="copy"
                    onClick={() => {
                      copyAgentConfigPrompt(config, onCopySuccess);
                    }}
                    key="copyConfig"
                  >
                    <FormattedMessage
                      id="xpack.ingestManager.agentConfigActionMenu.copyConfigActionText"
                      defaultMessage="Copy config"
                    />
                  </EuiContextMenuItem>,
                ]}
              />
            </>
          );
        }}
      </AgentConfigCopyProvider>
    );
  }
);
