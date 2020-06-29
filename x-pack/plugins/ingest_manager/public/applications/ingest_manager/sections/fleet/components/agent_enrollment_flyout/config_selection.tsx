/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiSelect, EuiSpacer, EuiText, EuiButtonEmpty } from '@elastic/eui';
import { AgentConfig } from '../../../../types';
import { useGetEnrollmentAPIKeys } from '../../../../hooks';
import { AgentConfigPackageBadges } from '../agent_config_package_badges';

interface Props {
  agentConfigs: AgentConfig[];
  onKeyChange: (key: string) => void;
}

export const EnrollmentStepAgentConfig: React.FC<Props> = ({ agentConfigs, onKeyChange }) => {
  const [isAuthenticationSettingsOpen, setIsAuthenticationSettingsOpen] = useState(false);
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
      (key) => key.config_id === selectedState.agentConfigId
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
      <EuiSelect
        fullWidth
        prepend={
          <EuiText>
            <FormattedMessage
              id="xpack.ingestManager.enrollmentStepAgentConfig.configSelectLabel"
              defaultMessage="Agent configuration"
            />
          </EuiText>
        }
        options={agentConfigs.map((config) => ({
          value: config.id,
          text: config.name,
        }))}
        value={selectedState.agentConfigId || undefined}
        onChange={(e) =>
          setSelectedState({
            agentConfigId: e.target.value,
            enrollmentAPIKeyId: undefined,
          })
        }
        aria-label={i18n.translate(
          'xpack.ingestManager.enrollmentStepAgentConfig.configSelectAriaLabel',
          { defaultMessage: 'Agent configuration' }
        )}
      />
      <EuiSpacer size="m" />
      {selectedState.agentConfigId && (
        <AgentConfigPackageBadges agentConfigId={selectedState.agentConfigId} />
      )}
      <EuiSpacer size="m" />
      <EuiButtonEmpty
        flush="left"
        iconType={isAuthenticationSettingsOpen ? 'arrowDown' : 'arrowRight'}
        onClick={() => setIsAuthenticationSettingsOpen(!isAuthenticationSettingsOpen)}
      >
        <FormattedMessage
          id="xpack.ingestManager.enrollmentStepAgentConfig.showAuthenticationSettingsButton"
          defaultMessage="Authentication settings"
        />
      </EuiButtonEmpty>
      {isAuthenticationSettingsOpen && (
        <>
          <EuiSpacer size="m" />
          <EuiSelect
            fullWidth
            options={filteredEnrollmentAPIKeys.map((key) => ({
              value: key.id,
              text: key.name,
            }))}
            value={selectedState.enrollmentAPIKeyId || undefined}
            prepend={
              <EuiText>
                <FormattedMessage
                  id="xpack.ingestManager.enrollmentStepAgentConfig.enrollmentTokenSelectLabel"
                  defaultMessage="Enrollment token"
                />
              </EuiText>
            }
            onChange={(e) => {
              setSelectedState({
                ...selectedState,
                enrollmentAPIKeyId: e.target.value,
              });
              onKeyChange(e.target.value);
            }}
          />
        </>
      )}
    </>
  );
};
