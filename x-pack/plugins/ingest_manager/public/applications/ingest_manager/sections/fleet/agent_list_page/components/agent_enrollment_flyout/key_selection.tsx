/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiLink,
  EuiFieldText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { AgentConfig } from '../../../../../types';
import { useInput, useCore, sendRequest, useGetEnrollmentAPIKeys } from '../../../../../hooks';
import { enrollmentAPIKeyRouteService } from '../../../../../services';

interface Props {
  onKeyChange: (keyId: string | undefined) => void;
  agentConfigs: AgentConfig[];
}

function useCreateApiKeyForm(configId: string | undefined, onSuccess: (keyId: string) => void) {
  const { notifications } = useCore();
  const [isLoading, setIsLoading] = useState(false);
  const apiKeyNameInput = useInput('');

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const res = await sendRequest({
        method: 'post',
        path: enrollmentAPIKeyRouteService.getCreatePath(),
        body: JSON.stringify({
          name: apiKeyNameInput.value,
          config_id: configId,
        }),
      });
      apiKeyNameInput.clear();
      setIsLoading(false);
      onSuccess(res.data.item.id);
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
    apiKeyNameInput,
  };
}

export const APIKeySelection: React.FunctionComponent<Props> = ({ onKeyChange, agentConfigs }) => {
  const enrollmentAPIKeysRequest = useGetEnrollmentAPIKeys({
    page: 1,
    perPage: 1000,
  });

  const [selectedState, setSelectedState] = useState<{
    agentConfigId?: string;
    enrollmentAPIKeyId?: string;
  }>({
    agentConfigId: agentConfigs.length ? agentConfigs[0].id : undefined,
  });
  const filteredEnrollmentAPIKeys = React.useMemo(() => {
    if (!selectedState.agentConfigId || !enrollmentAPIKeysRequest.data) {
      return [];
    }

    return enrollmentAPIKeysRequest.data.list.filter(
      key => key.config_id === selectedState.agentConfigId
    );
  }, [enrollmentAPIKeysRequest.data, selectedState.agentConfigId]);

  // Select first API key when config change
  React.useEffect(() => {
    if (!selectedState.enrollmentAPIKeyId && filteredEnrollmentAPIKeys.length > 0) {
      const enrollmentAPIKeyId = filteredEnrollmentAPIKeys[0].id;
      setSelectedState({
        agentConfigId: selectedState.agentConfigId,
        enrollmentAPIKeyId,
      });
      onKeyChange(enrollmentAPIKeyId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredEnrollmentAPIKeys, selectedState.enrollmentAPIKeyId, selectedState.agentConfigId]);

  const [showAPIKeyForm, setShowAPIKeyForm] = useState(false);
  const apiKeyForm = useCreateApiKeyForm(selectedState.agentConfigId, async (keyId: string) => {
    const res = await enrollmentAPIKeysRequest.sendRequest();
    setSelectedState({
      ...selectedState,
      enrollmentAPIKeyId: res.data?.list.find(key => key.id === keyId)?.id,
    });
    setShowAPIKeyForm(false);
  });

  return (
    <>
      <EuiText>
        <FormattedMessage
          id="xpack.ingestManager.agentEnrollment.apiKeySelectionDescription"
          defaultMessage="Quick Select your desired agent configuration and platform. Then, follow the instructions below to setup and enroll your agent."
        />
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ingestManager.agentEnrollment.selectAgentConfig"
                defaultMessage="Agent configuration"
              />
            }
          >
            <EuiSelect
              options={agentConfigs.map(agentConfig => ({
                value: agentConfig.id,
                text: agentConfig.name,
              }))}
              value={selectedState.agentConfigId || undefined}
              onChange={e =>
                setSelectedState({
                  agentConfigId: e.target.value,
                  enrollmentAPIKeyId: undefined,
                })
              }
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ingestManager.agentEnrollment.selectAPIKeyTitle"
                defaultMessage="Enrollment API key"
              />
            }
            labelAppend={
              <EuiText size="xs">
                <EuiLink onClick={() => setShowAPIKeyForm(!showAPIKeyForm)} color="primary">
                  {showAPIKeyForm ? (
                    <FormattedMessage
                      id="xpack.ingestManager.enrollmentApiKeyList.useExistingsButton"
                      defaultMessage="Use existing keys"
                    />
                  ) : (
                    <FormattedMessage
                      id="xpack.ingestManager.enrollmentApiKeyList.createNewButton"
                      defaultMessage="Create a new key"
                    />
                  )}
                </EuiLink>
              </EuiText>
            }
          >
            {showAPIKeyForm ? (
              <form onSubmit={apiKeyForm.onSubmit}>
                <EuiFieldText
                  isLoading={apiKeyForm.isLoading}
                  disabled={apiKeyForm.isLoading}
                  {...apiKeyForm.apiKeyNameInput.props}
                  placeholder={i18n.translate(
                    'xpack.ingestManager.enrollmentApiKeyForm.namePlaceholder',
                    {
                      defaultMessage: 'Choose a name',
                    }
                  )}
                />
              </form>
            ) : (
              <EuiSelect
                options={filteredEnrollmentAPIKeys.map(key => ({
                  value: key.id,
                  text: key.name,
                }))}
                value={selectedState.enrollmentAPIKeyId || undefined}
                onChange={e => {
                  setSelectedState({
                    ...selectedState,
                    enrollmentAPIKeyId: e.target.value,
                  });
                  onKeyChange(selectedState.enrollmentAPIKeyId);
                }}
              />
            )}
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
