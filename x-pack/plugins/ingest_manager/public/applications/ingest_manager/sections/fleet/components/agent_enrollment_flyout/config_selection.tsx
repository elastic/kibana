/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiSelect, EuiSpacer, EuiText, EuiButtonEmpty } from '@elastic/eui';
import { AgentConfig, GetEnrollmentAPIKeysResponse } from '../../../../types';
import { sendGetEnrollmentAPIKeys, useCore } from '../../../../hooks';
import { AgentConfigPackageBadges } from '../agent_config_package_badges';

type Props = {
  agentConfigs?: AgentConfig[];
  onConfigChange?: (key: string) => void;
} & (
  | {
      withKeySelection: true;
      onKeyChange?: (key: string) => void;
    }
  | {
      withKeySelection: false;
    }
);

export const EnrollmentStepAgentConfig: React.FC<Props> = (props) => {
  const { notifications } = useCore();
  const { withKeySelection, agentConfigs, onConfigChange } = props;
  const onKeyChange = props.withKeySelection && props.onKeyChange;

  const [isAuthenticationSettingsOpen, setIsAuthenticationSettingsOpen] = useState(false);
  const [enrollmentAPIKeys, setEnrollmentAPIKeys] = useState<GetEnrollmentAPIKeysResponse['list']>(
    []
  );
  const [selectedState, setSelectedState] = useState<{
    agentConfigId?: string;
    enrollmentAPIKeyId?: string;
  }>({});

  useEffect(() => {
    if (agentConfigs && agentConfigs.length && !selectedState.agentConfigId) {
      setSelectedState({
        ...selectedState,
        agentConfigId: agentConfigs[0].id,
      });
    }
  }, [agentConfigs, selectedState]);

  useEffect(() => {
    if (onConfigChange && selectedState.agentConfigId) {
      onConfigChange(selectedState.agentConfigId);
    }
  }, [selectedState.agentConfigId, onConfigChange]);

  useEffect(() => {
    if (!withKeySelection) {
      return;
    }
    if (!selectedState.agentConfigId) {
      setEnrollmentAPIKeys([]);
      return;
    }

    async function fetchEnrollmentAPIKeys() {
      try {
        const res = await sendGetEnrollmentAPIKeys({
          page: 1,
          perPage: 10000,
        });
        if (res.error) {
          throw res.error;
        }

        if (!res.data) {
          throw new Error('No data while fetching enrollment API keys');
        }

        setEnrollmentAPIKeys(
          res.data.list.filter((key) => key.config_id === selectedState.agentConfigId)
        );
      } catch (error) {
        notifications.toasts.addError(error, {
          title: 'Error',
        });
      }
    }
    fetchEnrollmentAPIKeys();
  }, [withKeySelection, selectedState.agentConfigId, notifications.toasts]);

  // Select first API key when config change
  React.useEffect(() => {
    if (!withKeySelection || !onKeyChange) {
      return;
    }
    if (!selectedState.enrollmentAPIKeyId && enrollmentAPIKeys.length > 0) {
      const enrollmentAPIKeyId = enrollmentAPIKeys[0].id;
      setSelectedState({
        agentConfigId: selectedState.agentConfigId,
        enrollmentAPIKeyId,
      });
      onKeyChange(enrollmentAPIKeyId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrollmentAPIKeys, selectedState.enrollmentAPIKeyId, selectedState.agentConfigId]);

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
        isLoading={!agentConfigs}
        options={(agentConfigs || []).map((config) => ({
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
      {withKeySelection && onKeyChange && (
        <>
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
                options={enrollmentAPIKeys.map((key) => ({
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
      )}
    </>
  );
};
