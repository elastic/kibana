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
import { PolicyForm, policyFormValidation } from './policy_form';

interface Props {
  agentConfig: AgentConfig;
  onClose: () => void;
}

export const EditPolicyFlyout: React.FunctionComponent<Props> = ({
  agentConfig: originalAgentConfig,
  onClose,
}) => {
  const { notifications } = useCore();
  const [policy, setPolicy] = useState<Partial<AgentConfig>>({
    name: originalAgentConfig.name,
    description: originalAgentConfig.description,
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const updatePolicy = (updatedFields: Partial<AgentConfig>) => {
    setPolicy({
      ...policy,
      ...updatedFields,
    });
  };
  const validation = policyFormValidation(policy);

  const header = (
    <EuiFlyoutHeader hasBorder aria-labelledby="FleetEditPolicyFlyoutTitle">
      <EuiTitle size="m">
        <h2 id="FleetEditPolicyFlyoutTitle">
          <FormattedMessage
            id="xpack.ingestManager.editPolicy.flyoutTitle"
            defaultMessage="Edit policy"
          />
        </h2>
      </EuiTitle>
    </EuiFlyoutHeader>
  );

  const body = (
    <EuiFlyoutBody>
      <PolicyForm policy={policy} updatePolicy={updatePolicy} validation={validation} />
    </EuiFlyoutBody>
  );

  const footer = (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
            <FormattedMessage
              id="xpack.ingestManager.editPolicy.cancelButtonLabel"
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
                  body: JSON.stringify(policy),
                });
                if (!error) {
                  notifications.toasts.addSuccess(
                    i18n.translate('xpack.ingestManager.editPolicy.successNotificationTitle', {
                      defaultMessage: "Agent config '{name}' updated",
                      values: { name: policy.name },
                    })
                  );
                } else {
                  notifications.toasts.addDanger(
                    error
                      ? error.message
                      : i18n.translate('xpack.ingestManager.editPolicy.errorNotificationTitle', {
                          defaultMessage: 'Unable to update agent config',
                        })
                  );
                }
              } catch (e) {
                notifications.toasts.addDanger(
                  i18n.translate('xpack.ingestManager.editPolicy.errorNotificationTitle', {
                    defaultMessage: 'Unable to update agent config',
                  })
                );
              }
              setIsLoading(false);
              onClose();
            }}
          >
            <FormattedMessage
              id="xpack.ingestManager.editPolicy.submitButtonLabel"
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
