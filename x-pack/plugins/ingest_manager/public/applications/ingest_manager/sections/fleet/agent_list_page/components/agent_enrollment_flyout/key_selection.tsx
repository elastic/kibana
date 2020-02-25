/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSelect, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { useEnrollmentApiKeys, CreateApiKeyButton } from '../enrollment_api_keys';
import { AgentConfig } from '../../../../../types';

interface Props {
  onKeyChange: (keyId: string | null) => void;
  agentConfigs: AgentConfig[];
}

export const APIKeySelection: React.FunctionComponent<Props> = ({ onKeyChange, agentConfigs }) => {
  const enrollmentAPIKeysRequest = useEnrollmentApiKeys({
    currentPage: 1,
    pageSize: 1000,
  });

  const [selectedState, setSelectedState] = useState<{
    agentConfigId: string | null;
    enrollmentAPIKeyId: string | null;
  }>({
    agentConfigId: agentConfigs.length ? agentConfigs[0].id : null,
    enrollmentAPIKeyId: null,
  });
  const filteredEnrollmentAPIKeys = React.useMemo(() => {
    if (!selectedState.agentConfigId || !enrollmentAPIKeysRequest.data) {
      return [];
    }

    return enrollmentAPIKeysRequest.data.list.filter(
      key => key.policy_id === selectedState.agentConfigId
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
                  enrollmentAPIKeyId: null,
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
                <CreateApiKeyButton
                  onChange={async () => {
                    await enrollmentAPIKeysRequest.refresh();
                  }}
                />
              </EuiText>
            }
          >
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
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
