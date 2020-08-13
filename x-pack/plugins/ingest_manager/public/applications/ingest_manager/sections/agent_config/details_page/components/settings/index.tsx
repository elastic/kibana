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
import { AgentPolicy } from '../../../../../types';
import {
  useLink,
  useCore,
  useCapabilities,
  sendUpdateAgentPolicy,
  useConfig,
  sendGetAgentStatus,
} from '../../../../../hooks';
import {
  AgentPolicyForm,
  agentPolicyFormValidation,
  ConfirmDeployAgentPolicyModal,
} from '../../../components';
import { useAgentPolicyRefresh } from '../../hooks';

const FormWrapper = styled.div`
  max-width: 800px;
  margin-right: auto;
  margin-left: auto;
`;

export const SettingsView = memo<{ agentPolicy: AgentPolicy }>(
  ({ agentPolicy: originalAgentPolicy }) => {
    const {
      notifications,
      chrome: { getIsNavDrawerLocked$ },
      uiSettings,
    } = useCore();
    const {
      fleet: { enabled: isFleetEnabled },
    } = useConfig();
    const history = useHistory();
    const { getPath } = useLink();
    const hasWriteCapabilites = useCapabilities().write;
    const refreshAgentPolicy = useAgentPolicyRefresh();
    const [isNavDrawerLocked, setIsNavDrawerLocked] = useState(false);
    const [agentPolicy, setAgentPolicy] = useState<AgentPolicy>({
      ...originalAgentPolicy,
    });
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [hasChanges, setHasChanges] = useState<boolean>(false);
    const [agentCount, setAgentCount] = useState<number>(0);
    const [withSysMonitoring, setWithSysMonitoring] = useState<boolean>(true);
    const validation = agentPolicyFormValidation(agentPolicy);

    useEffect(() => {
      const subscription = getIsNavDrawerLocked$().subscribe((newIsNavDrawerLocked: boolean) => {
        setIsNavDrawerLocked(newIsNavDrawerLocked);
      });

      return () => subscription.unsubscribe();
    });

    const updateAgentPolicy = (updatedFields: Partial<AgentPolicy>) => {
      setAgentPolicy({
        ...agentPolicy,
        ...updatedFields,
      });
      setHasChanges(true);
    };

    const submitUpdateAgentPolicy = async () => {
      setIsLoading(true);
      try {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        const { name, description, namespace, monitoring_enabled } = agentPolicy;
        const { data, error } = await sendUpdateAgentPolicy(agentPolicy.id, {
          name,
          description,
          namespace,
          monitoring_enabled,
        });
        if (data?.success) {
          notifications.toasts.addSuccess(
            i18n.translate('xpack.ingestManager.editAgentPolicy.successNotificationTitle', {
              defaultMessage: "Successfully updated '{name}' settings",
              values: { name: agentPolicy.name },
            })
          );
          refreshAgentPolicy();
          setHasChanges(false);
        } else {
          notifications.toasts.addDanger(
            error
              ? error.message
              : i18n.translate('xpack.ingestManager.editAgentPolicy.errorNotificationTitle', {
                  defaultMessage: 'Unable to update agent policy',
                })
          );
        }
      } catch (e) {
        notifications.toasts.addDanger(
          i18n.translate('xpack.ingestManager.editAgentPolicy.errorNotificationTitle', {
            defaultMessage: 'Unable to update agent policy',
          })
        );
      }
      setIsLoading(false);
    };

    const onSubmit = async () => {
      // Retrieve agent count if fleet is enabled
      if (isFleetEnabled) {
        setIsLoading(true);
        const { data } = await sendGetAgentStatus({ policyId: agentPolicy.id });
        if (data?.results.total) {
          setAgentCount(data.results.total);
        } else {
          await submitUpdateAgentPolicy();
        }
      } else {
        await submitUpdateAgentPolicy();
      }
    };

    return (
      <FormWrapper>
        {agentCount ? (
          <ConfirmDeployAgentPolicyModal
            agentCount={agentCount}
            agentPolicy={agentPolicy}
            onConfirm={() => {
              setAgentCount(0);
              submitUpdateAgentPolicy();
            }}
            onCancel={() => {
              setAgentCount(0);
              setIsLoading(false);
            }}
          />
        ) : null}
        <AgentPolicyForm
          agentPolicy={agentPolicy}
          updateAgentPolicy={updateAgentPolicy}
          withSysMonitoring={withSysMonitoring}
          updateSysMonitoring={(newValue) => setWithSysMonitoring(newValue)}
          validation={validation}
          isEditing={true}
          onDelete={() => {
            history.push(getPath('policies_list'));
          }}
        />
        {/* TODO #64541 - Remove classes */}
        {hasChanges ? (
          <EuiBottomBar
            className={
              uiSettings.get('pageNavigation') === 'legacy'
                ? isNavDrawerLocked
                  ? 'ingestManager__bottomBar-isNavDrawerLocked'
                  : 'ingestManager__bottomBar'
                : undefined
            }
          >
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
              <EuiFlexItem>
                <FormattedMessage
                  id="xpack.ingestManager.editAgentPolicy.unsavedChangesText"
                  defaultMessage="You have unsaved changes"
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGroup gutterSize="s" justifyContent="flexEnd">
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      color="ghost"
                      onClick={() => {
                        setAgentPolicy({ ...originalAgentPolicy });
                        setHasChanges(false);
                      }}
                    >
                      <FormattedMessage
                        id="xpack.ingestManager.editAgentPolicy.cancelButtonText"
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
                          id="xpack.ingestManager.editAgentPolicy.savingButtonText"
                          defaultMessage="Saving…"
                        />
                      ) : (
                        <FormattedMessage
                          id="xpack.ingestManager.editAgentPolicy.saveButtonText"
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
