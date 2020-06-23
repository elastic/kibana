/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiFlyoutFooter,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiSelect,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { AgentConfig } from '../../../../types';
import { useInput, useCore, sendRequest } from '../../../../hooks';
import { enrollmentAPIKeyRouteService } from '../../../../services';

function useCreateApiKeyForm(
  configDefaultValue: string | undefined,
  onSuccess: (keyId: string) => void
) {
  const { notifications } = useCore();
  const [isLoading, setIsLoading] = useState(false);
  const apiKeyNameInput = useInput('');
  const configIdInput = useInput(configDefaultValue);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const res = await sendRequest({
        method: 'post',
        path: enrollmentAPIKeyRouteService.getCreatePath(),
        body: JSON.stringify({
          name: apiKeyNameInput.value,
          config_id: configIdInput.value,
        }),
      });
      configIdInput.clear();
      apiKeyNameInput.clear();
      setIsLoading(false);
      onSuccess(res.data.item.id);
      notifications.toasts.addSuccess(
        i18n.translate('xpack.ingestManager.newEnrollmentKey.keyCreatedToasts', {
          defaultMessage: 'Enrollment token created.',
        })
      );
    } catch (err) {
      notifications.toasts.addError(err as Error, {
        title: 'Error',
      });
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    onSubmit,
    configIdInput,
    apiKeyNameInput,
  };
}

interface Props {
  onClose: () => void;
  agentConfigs: AgentConfig[];
}

export const NewEnrollmentTokenFlyout: React.FunctionComponent<Props> = ({
  onClose,
  agentConfigs = [],
}) => {
  const configDefaultValue = agentConfigs.find((config) => config.is_default)?.id;
  const form = useCreateApiKeyForm(configDefaultValue, () => {
    onClose();
  });

  const body = (
    <EuiForm>
      <form onSubmit={form.onSubmit}>
        <EuiFormRow
          label={i18n.translate('xpack.ingestManager.newEnrollmentKey.nameLabel', {
            defaultMessage: 'Name',
          })}
        >
          <EuiFieldText
            required={true}
            name="name"
            autoComplete="off"
            {...form.apiKeyNameInput.props}
          />
        </EuiFormRow>

        <EuiFormRow
          label={i18n.translate('xpack.ingestManager.newEnrollmentKey.configLabel', {
            defaultMessage: 'Configuration',
          })}
        >
          <EuiSelect
            required={true}
            defaultValue={configDefaultValue}
            {...form.configIdInput.props}
            options={agentConfigs.map((config) => ({ value: config.id, text: config.name }))}
          />
        </EuiFormRow>
        <EuiButton type="submit" fill isLoading={form.isLoading}>
          <FormattedMessage
            id="xpack.ingestManager.newEnrollmentKey.submitButton"
            defaultMessage="Create enrollment token"
          />
        </EuiButton>
      </form>
    </EuiForm>
  );

  return (
    <EuiFlyout onClose={onClose} size="l" maxWidth={640}>
      <EuiFlyoutHeader hasBorder aria-labelledby="FleetNewEnrollmentKeyFlyoutTitle">
        <EuiTitle size="m">
          <h2 id="FleetNewEnrollmentKeyFlyoutTitle">
            <FormattedMessage
              id="xpack.ingestManager.newEnrollmentKey.flyoutTitle"
              defaultMessage="Create a new enrollment token"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{body}</EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
              <FormattedMessage
                id="xpack.ingestManager.newEnrollmentKey.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
