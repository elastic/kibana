/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo, useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import { EuiBottomBar, EuiFlexGroup, EuiFlexItem, EuiButtonEmpty, EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { AGENT_CONFIG_PATH } from '../../../../../constants';
import { AgentConfig } from '../../../../../types';
import { useCore, useCapabilities, sendUpdateAgentConfig } from '../../../../../hooks';
import { AgentConfigForm, agentConfigFormValidation } from '../../../components';

const FormWrapper = styled.div`
  max-width: 800px;
  margin-right: auto;
  margin-left: auto;
`;

export const ConfigSettingsView = memo<{ config: AgentConfig }>(
  ({ config: originalAgentConfig }) => {
    const {
      notifications,
      chrome: { getIsNavDrawerLocked$ },
    } = useCore();
    const history = useHistory();
    const hasWriteCapabilites = useCapabilities().write;
    const [isNavDrawerLocked, setIsNavDrawerLocked] = useState(false);
    const [agentConfig, setAgentConfig] = useState<AgentConfig>({
      ...originalAgentConfig,
    });
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [hasChanges, setHasChanges] = useState<boolean>(false);
    const [withSysMonitoring, setWithSysMonitoring] = useState<boolean>(true);
    const validation = agentConfigFormValidation(agentConfig);

    useEffect(() => {
      const subscription = getIsNavDrawerLocked$().subscribe((newIsNavDrawerLocked: boolean) => {
        setIsNavDrawerLocked(newIsNavDrawerLocked);
      });

      return () => subscription.unsubscribe();
    });

    const updateAgentConfig = (updatedFields: Partial<AgentConfig>) => {
      setAgentConfig({
        ...agentConfig,
        ...updatedFields,
      });
      setHasChanges(true);
    };

    const onSubmit = async () => {
      setIsLoading(true);
      try {
        const { name, description, namespace, monitoring_enabled } = agentConfig;
        const { data, error } = await sendUpdateAgentConfig(agentConfig.id, {
          name,
          description,
          namespace,
          monitoring_enabled,
        });
        if (data?.success) {
          notifications.toasts.addSuccess(
            i18n.translate('xpack.ingestManager.editAgentConfig.successNotificationTitle', {
              defaultMessage: "Successfully updated '{name}' settings",
              values: { name: agentConfig.name },
            })
          );
          setHasChanges(false);
        } else {
          notifications.toasts.addDanger(
            error
              ? error.message
              : i18n.translate('xpack.ingestManager.editAgentConfig.errorNotificationTitle', {
                  defaultMessage: 'Unable to update agent config',
                })
          );
        }
      } catch (e) {
        notifications.toasts.addDanger(
          i18n.translate('xpack.ingestManager.editAgentConfig.errorNotificationTitle', {
            defaultMessage: 'Unable to update agent config',
          })
        );
      }

      setIsLoading(false);
    };

    return (
      <FormWrapper>
        <AgentConfigForm
          agentConfig={agentConfig}
          updateAgentConfig={updateAgentConfig}
          withSysMonitoring={withSysMonitoring}
          updateSysMonitoring={newValue => setWithSysMonitoring(newValue)}
          validation={validation}
          isEditing={true}
          onDelete={() => {
            history.push(AGENT_CONFIG_PATH);
          }}
        />
        {hasChanges ? (
          <EuiBottomBar
            css={{ zIndex: 5 }}
            className={
              isNavDrawerLocked
                ? 'ingestManager__bottomBar-isNavDrawerLocked'
                : 'ingestManager__bottomBar'
            }
          >
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiFlexItem>
                <FormattedMessage
                  id="xpack.ingestManager.editAgentConfig.unsavedChangesText"
                  defaultMessage="You have unsaved changes"
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      color="ghost"
                      onClick={() => {
                        setAgentConfig({ ...originalAgentConfig });
                        setHasChanges(false);
                      }}
                    >
                      <FormattedMessage
                        id="xpack.ingestManager.editAgentConfig.cancelButtonText"
                        defaultMessage="Cancel"
                      />
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      onClick={onSubmit}
                      isLoading={isLoading}
                      isDisabled={
                        !hasWriteCapabilites || isLoading || Object.keys(validation).length > 0
                      }
                      iconType="save"
                      color="primary"
                      fill
                    >
                      {isLoading ? (
                        <FormattedMessage
                          id="xpack.ingestManager.editAgentConfig.savingButtonText"
                          defaultMessage="Saving…"
                        />
                      ) : (
                        <FormattedMessage
                          id="xpack.ingestManager.editAgentConfig.saveButtonText"
                          defaultMessage="Save changes"
                        />
                      )}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiBottomBar>
        ) : null}
      </FormWrapper>
    );
  }
);
