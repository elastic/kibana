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
} from '@elastic/eui';
import { NewAgentConfig } from '../../../../types';
import { useCore, sendCreateAgentConfig } from '../../../../hooks';
import { AgentConfigForm, agentConfigFormValidation } from '../../components';

interface Props {
  onClose: () => void;
}

export const CreateAgentConfigFlyout: React.FunctionComponent<Props> = ({ onClose }) => {
  const { notifications } = useCore();

  const [agentConfig, setAgentConfig] = useState<NewAgentConfig>({
    name: '',
    description: '',
    namespace: '',
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const validation = agentConfigFormValidation(agentConfig);

  const updateAgentConfig = (updatedFields: Partial<NewAgentConfig>) => {
    setAgentConfig({
      ...agentConfig,
      ...updatedFields,
    });
  };

  const createAgentConfig = async () => {
    return await sendCreateAgentConfig(agentConfig);
  };

  const header = (
    <EuiFlyoutHeader hasBorder aria-labelledby="CreateAgentConfigFlyoutTitle">
      <EuiTitle size="m">
        <h2 id="CreateAgentConfigFlyoutTitle">
          <FormattedMessage
            id="xpack.ingestManager.createAgentConfig.flyoutTitle"
            defaultMessage="Create new agent config"
          />
        </h2>
      </EuiTitle>
    </EuiFlyoutHeader>
  );

  const body = (
    <EuiFlyoutBody>
      <AgentConfigForm
        agentConfig={agentConfig}
        updateAgentConfig={updateAgentConfig}
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
            disabled={isLoading || Object.keys(validation).length > 0}
            onClick={async () => {
              setIsLoading(true);
              try {
                const { data, error } = await createAgentConfig();
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
                notifications.toasts.addDanger(
                  i18n.translate('xpack.ingestManager.createAgentConfig.errorNotificationTitle', {
                    defaultMessage: 'Unable to create agent config',
                  })
                );
              }
              setIsLoading(false);
              onClose();
            }}
          >
            <FormattedMessage
              id="xpack.ingestManager.createAgentConfig.submitButtonLabel"
              defaultMessage="Continue"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );

  return (
    <EuiFlyout onClose={onClose} size="m" maxWidth={400}>
      {header}
      {body}
      {footer}
    </EuiFlyout>
  );
};
