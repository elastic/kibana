/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiContextMenuItem, EuiPortal } from '@elastic/eui';
import { useCapabilities, useLink } from '../../../hooks';
import { ContextMenuActions } from '../../../components';
import { ConfigYamlFlyout } from './config_yaml_flyout';

export const AgentConfigActionMenu = memo<{ configId: string; fullButton?: boolean }>(
  ({ configId, fullButton = false }) => {
    const { getHref } = useLink();
    const hasWriteCapabilities = useCapabilities().write;
    const [isYamlFlyoutOpen, setIsYamlFlyoutOpen] = useState<boolean>(false);
    return (
      <>
        {isYamlFlyoutOpen ? (
          <EuiPortal>
            <ConfigYamlFlyout configId={configId} onClose={() => setIsYamlFlyoutOpen(false)} />
          </EuiPortal>
        ) : null}
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
              icon="plusInCircle"
              href={getHref('add_datasource_from_configuration', { configId })}
              key="createDatasource"
            >
              <FormattedMessage
                id="xpack.ingestManager.agentConfigActionMenu.createDatasourceActionText"
                defaultMessage="Create data source"
              />
            </EuiContextMenuItem>,
          ]}
        />
      </>
    );
  }
);
