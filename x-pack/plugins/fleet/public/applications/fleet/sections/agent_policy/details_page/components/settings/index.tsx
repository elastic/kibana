/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import styled from 'styled-components';
import {
  EuiBottomBar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { AgentPolicy } from '../../../../../types';
import {
  useLink,
  useStartServices,
  useAuthz,
  sendUpdateAgentPolicy,
  useConfig,
  sendGetAgentStatus,
  useAgentPolicyRefresh,
  useBreadcrumbs,
} from '../../../../../hooks';
import {
  AgentPolicyForm,
  agentPolicyFormValidation,
  ConfirmDeployAgentPolicyModal,
} from '../../../components';

const FormWrapper = styled.div`
  max-width: 800px;
  margin-right: auto;
  margin-left: auto;
`;

export const SettingsView = memo<{ agentPolicy: AgentPolicy }>(
  ({ agentPolicy: originalAgentPolicy }) => {
    useBreadcrumbs('policy_details', { policyName: originalAgentPolicy.name });
    const { notifications } = useStartServices();
    const {
      agents: { enabled: isFleetEnabled },
    } = useConfig();
    const history = useHistory();
    const { getPath } = useLink();
    const hasFleetAllPrivileges = useAuthz().fleet.all;
    const refreshAgentPolicy = useAgentPolicyRefresh();
    const [agentPolicy, setAgentPolicy] = useState<AgentPolicy>({
      ...originalAgentPolicy,
    });
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [hasChanges, setHasChanges] = useState<boolean>(false);
    const [agentCount, setAgentCount] = useState<number>(0);
    const [withSysMonitoring, setWithSysMonitoring] = useState<boolean>(true);
    const validation = agentPolicyFormValidation(agentPolicy);

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
        const {
          name,
          description,
          namespace,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          monitoring_enabled,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          unenroll_timeout,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          data_output_id,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          monitoring_output_id,
        } = agentPolicy;
        const { data, error } = await sendUpdateAgentPolicy(agentPolicy.id, {
          name,
          description,
          namespace,
          monitoring_enabled,
          unenroll_timeout,
          data_output_id,
          monitoring_output_id,
        });
        if (data) {
          notifications.toasts.addSuccess(
            i18n.translate('xpack.fleet.editAgentPolicy.successNotificationTitle', {
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
              : i18n.translate('xpack.fleet.editAgentPolicy.errorNotificationTitle', {
                  defaultMessage: 'Unable to update agent policy',
                })
          );
        }
      } catch (e) {
        notifications.toasts.addDanger(
          i18n.translate('xpack.fleet.editAgentPolicy.errorNotificationTitle', {
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

        {hasChanges ? (
          <>
            <EuiSpacer size="xl" />
            <EuiSpacer size="xl" />
            <EuiBottomBar>
              <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                <EuiFlexItem>
                  <FormattedMessage
                    id="xpack.fleet.editAgentPolicy.unsavedChangesText"
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
                          id="xpack.fleet.editAgentPolicy.cancelButtonText"
                          defaultMessage="Cancel"
                        />
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButton
                        onClick={onSubmit}
                        isLoading={isLoading}
                        isDisabled={
                          !hasFleetAllPrivileges || isLoading || Object.keys(validation).length > 0
                        }
                        iconType="save"
                        color="primary"
                        fill
                      >
                        {isLoading ? (
                          <FormattedMessage
                            id="xpack.fleet.editAgentPolicy.savingButtonText"
                            defaultMessage="Saving…"
                          />
                        ) : (
                          <FormattedMessage
                            id="xpack.fleet.editAgentPolicy.saveButtonText"
                            defaultMessage="Save changes"
                          />
                        )}
                      </EuiButton>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiBottomBar>
          </>
        ) : null}
      </FormWrapper>
    );
  }
);
