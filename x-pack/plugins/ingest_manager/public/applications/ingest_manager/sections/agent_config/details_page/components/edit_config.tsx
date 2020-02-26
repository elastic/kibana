/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
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
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { useCore, sendRequest } from '../../../../hooks';
import { agentConfigRouteService } from '../../../../services';
import { AgentConfig } from '../../../../types';
import { ConfigForm, configFormValidation } from './config_form';

interface Props {
  agentConfig: AgentConfig;
  onClose: () => void;
}

export const EditConfigFlyout: React.FunctionComponent<Props> = ({
  agentConfig: originalAgentConfig,
  onClose,
}) => {
  const { notifications } = useCore();
  const [config, setConfig] = useState<Partial<AgentConfig>>({
    name: originalAgentConfig.name,
    description: originalAgentConfig.description,
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const updateConfig = (updatedFields: Partial<AgentConfig>) => {
    setConfig({
      ...config,
      ...updatedFields,
    });
  };
  const validation = configFormValidation(config);

  const header = (
    <EuiFlyoutHeader hasBorder aria-labelledby="FleetEditConfigFlyoutTitle">
      <EuiTitle size="m">
        <h2 id="FleetEditConfigFlyoutTitle">
          <FormattedMessage
            id="xpack.ingestManager.editConfig.flyoutTitle"
            defaultMessage="Edit config"
          />
        </h2>
      </EuiTitle>
    </EuiFlyoutHeader>
  );

  const body = (
    <EuiFlyoutBody>
      <ConfigForm config={config} updateConfig={updateConfig} validation={validation} />
    </EuiFlyoutBody>
  );

  const footer = (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
            <FormattedMessage
              id="xpack.ingestManager.editConfig.cancelButtonLabel"
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
                const { error } = await sendRequest({
                  path: agentConfigRouteService.getUpdatePath(originalAgentConfig.id),
                  method: 'put',
                  body: JSON.stringify(config),
                });
                if (!error) {
                  notifications.toasts.addSuccess(
                    i18n.translate('xpack.ingestManager.editConfig.successNotificationTitle', {
                      defaultMessage: "Agent config '{name}' updated",
                      values: { name: config.name },
                    })
                  );
                } else {
                  notifications.toasts.addDanger(
                    error
                      ? error.message
                      : i18n.translate('xpack.ingestManager.editConfig.errorNotificationTitle', {
                          defaultMessage: 'Unable to update agent config',
                        })
                  );
                }
              } catch (e) {
                notifications.toasts.addDanger(
                  i18n.translate('xpack.ingestManager.editConfig.errorNotificationTitle', {
                    defaultMessage: 'Unable to update agent config',
                  })
                );
              }
              setIsLoading(false);
              onClose();
            }}
          >
            <FormattedMessage
              id="xpack.ingestManager.editConfig.submitButtonLabel"
              defaultMessage="Update"
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
