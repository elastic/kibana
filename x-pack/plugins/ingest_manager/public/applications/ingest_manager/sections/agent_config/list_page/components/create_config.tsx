/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiText,
} from '@elastic/eui';
import { NewAgentConfig } from '../../../../types';
import { useCapabilities, useCore, sendCreateAgentConfig } from '../../../../hooks';
import { AgentConfigForm, agentConfigFormValidation } from '../../components';

interface Props {
  onClose: () => void;
}

export const CreateAgentConfigFlyout: React.FunctionComponent<Props> = ({ onClose }) => {
  const { notifications } = useCore();
  const hasWriteCapabilites = useCapabilities().write;
  const [agentConfig, setAgentConfig] = useState<NewAgentConfig>({
    name: '',
    description: '',
    namespace: 'default',
    is_default: undefined,
    monitoring_enabled: ['logs', 'metrics'],
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [withSysMonitoring, setWithSysMonitoring] = useState<boolean>(true);
  const validation = agentConfigFormValidation(agentConfig);

  const updateAgentConfig = (updatedFields: Partial<NewAgentConfig>) => {
    setAgentConfig({
      ...agentConfig,
      ...updatedFields,
    });
  };

  const createAgentConfig = async () => {
    return await sendCreateAgentConfig(agentConfig, { withSysMonitoring });
  };

  const header = (
    <EuiFlyoutHeader hasBorder aria-labelledby="CreateAgentConfigFlyoutTitle">
      <EuiTitle size="m">
        <h2 id="CreateAgentConfigFlyoutTitle">
          <FormattedMessage
            id="xpack.ingestManager.createAgentConfig.flyoutTitle"
            defaultMessage="Create agent configuration"
          />
        </h2>
      </EuiTitle>
      <EuiText size="s">
        <FormattedMessage
          id="xpack.ingestManager.createAgentConfig.flyoutTitleDescription"
          defaultMessage="Agent configurations are used to manage settings across a group of agents. You can add integrations to your agent configuration to specify what data your agents collect. When you edit an agent configuration, you can use Fleet to deploy updates to a specified group of agents."
        />
      </EuiText>
    </EuiFlyoutHeader>
  );

  const body = (
    <EuiFlyoutBody>
      <AgentConfigForm
        agentConfig={agentConfig}
        updateAgentConfig={updateAgentConfig}
        withSysMonitoring={withSysMonitoring}
        updateSysMonitoring={(newValue) => setWithSysMonitoring(newValue)}
        validation={validation}
      />
    </EuiFlyoutBody>
  );

  const footer = (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
            <FormattedMessage
              id="xpack.ingestManager.createAgentConfig.cancelButtonLabel"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            isLoading={isLoading}
            isDisabled={!hasWriteCapabilites || isLoading || Object.keys(validation).length > 0}
            onClick={async () => {
              setIsLoading(true);
              try {
                const { data, error } = await createAgentConfig();
                setIsLoading(false);
                if (data?.success) {
                  notifications.toasts.addSuccess(
                    i18n.translate(
                      'xpack.ingestManager.createAgentConfig.successNotificationTitle',
                      {
                        defaultMessage: "Agent config '{name}' created",
                        values: { name: agentConfig.name },
                      }
                    )
                  );
                  onClose();
                } else {
                  notifications.toasts.addDanger(
                    error
                      ? error.message
                      : i18n.translate(
                          'xpack.ingestManager.createAgentConfig.errorNotificationTitle',
                          {
                            defaultMessage: 'Unable to create agent config',
                          }
                        )
                  );
                }
              } catch (e) {
                setIsLoading(false);
                notifications.toasts.addDanger(
                  i18n.translate('xpack.ingestManager.createAgentConfig.errorNotificationTitle', {
                    defaultMessage: 'Unable to create agent config',
                  })
                );
              }
            }}
          >
            <FormattedMessage
              id="xpack.ingestManager.createAgentConfig.submitButtonLabel"
              defaultMessage="Create agent configuration"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );

  return (
    <EuiFlyout onClose={onClose} size="l" maxWidth={400}>
      {header}
      {body}
      {footer}
    </EuiFlyout>
  );
};
