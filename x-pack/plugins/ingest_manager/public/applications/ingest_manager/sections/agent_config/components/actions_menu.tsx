/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiContextMenuItem, EuiPortal } from '@elastic/eui';
import { AgentConfig } from '../../../types';
import { useCapabilities } from '../../../hooks';
import { ContextMenuActions } from '../../../components';
import { AgentEnrollmentFlyout } from '../../fleet/components';
import { ConfigYamlFlyout } from './config_yaml_flyout';

export const AgentConfigActionMenu = memo<{ config: AgentConfig; fullButton?: boolean }>(
  ({ config, fullButton = false }) => {
    const hasWriteCapabilities = useCapabilities().write;
    const [isYamlFlyoutOpen, setIsYamlFlyoutOpen] = useState<boolean>(false);
    const [isEnrollmentFlyoutOpen, setIsEnrollmentFlyoutOpen] = useState<boolean>(false);
    return (
      <>
        {isYamlFlyoutOpen ? (
          <EuiPortal>
            <ConfigYamlFlyout configId={config.id} onClose={() => setIsYamlFlyoutOpen(false)} />
          </EuiPortal>
        ) : null}
        {isEnrollmentFlyoutOpen && (
          <EuiPortal>
            <AgentEnrollmentFlyout
              agentConfigs={[config]}
              onClose={() => setIsEnrollmentFlyoutOpen(false)}
            />
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
                defaultMessage="Enroll agent"
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
          ]}
        />
      </>
    );
  }
);
