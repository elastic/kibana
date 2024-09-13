/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSelect, EuiFormLabel, EuiButtonEmpty, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import semverGte from 'semver/functions/gte';

import type { Agent } from '../../../../../types';
import { sendPostAgentAction, useAuthz, useStartServices } from '../../../../../hooks';

import { AGENT_LOG_LEVELS, DEFAULT_LOG_LEVEL } from '../../../../../../../../common/constants';

export const SelectLogLevel: React.FC<{ agent: Agent; agentPolicyLogLevel?: string }> = memo(
  ({ agent, agentPolicyLogLevel = DEFAULT_LOG_LEVEL }) => {
    const authz = useAuthz();
    const { notifications } = useStartServices();
    const [isSetLevelLoading, setIsSetLevelLoading] = useState(false);
    const [isResetLevelLoading, setIsResetLevelLoading] = useState(false);
    const canResetLogLevel = semverGte(
      agent.local_metadata?.elastic?.agent?.version,
      '8.15.0',
      true
    );

    const [agentLogLevel, setAgentLogLevel] = useState(
      agent.local_metadata?.elastic?.agent?.log_level ?? DEFAULT_LOG_LEVEL
    );
    const [selectedLogLevel, setSelectedLogLevel] = useState(agentLogLevel);

    const resetLogLevel = useCallback(() => {
      setIsResetLevelLoading(true);
      async function send() {
        try {
          const res = await sendPostAgentAction(agent.id, {
            action: {
              type: 'SETTINGS',
              data: {
                log_level: null,
              },
            },
          });
          if (res.error) {
            throw res.error;
          }

          // TODO: reset to an empty state?
          setAgentLogLevel(agentPolicyLogLevel);
          setSelectedLogLevel(agentPolicyLogLevel);

          notifications.toasts.addSuccess(
            i18n.translate('xpack.fleet.agentLogs.resetLogLevel.successText', {
              defaultMessage: `Reset agent logging level to policy`,
            })
          );
        } catch (error) {
          notifications.toasts.addError(error, {
            title: i18n.translate('xpack.fleet.agentLogs.resetLogLevel.errorTitleText', {
              defaultMessage: 'Error resetting agent logging level',
            }),
          });
        }
        setIsResetLevelLoading(false);
      }

      send();
    }, [agent.id, agentPolicyLogLevel, notifications]);

    const onClickApply = useCallback(() => {
      setIsSetLevelLoading(true);
      async function send() {
        try {
          const res = await sendPostAgentAction(agent.id, {
            action: {
              type: 'SETTINGS',
              data: {
                log_level: selectedLogLevel,
              },
            },
          });
          if (res.error) {
            throw res.error;
          }
          setAgentLogLevel(selectedLogLevel);
          notifications.toasts.addSuccess(
            i18n.translate('xpack.fleet.agentLogs.selectLogLevel.successText', {
              defaultMessage: `Changed agent logging level to ''{logLevel}''`,
              values: {
                logLevel: selectedLogLevel,
              },
            })
          );
        } catch (error) {
          notifications.toasts.addError(error, {
            title: i18n.translate('xpack.fleet.agentLogs.selectLogLevel.errorTitleText', {
              defaultMessage: 'Error updating agent logging level',
            }),
          });
        }
        setIsSetLevelLoading(false);
      }

      send();
    }, [notifications, selectedLogLevel, agent.id]);

    return (
      <>
        <EuiFlexGroup gutterSize="m" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiFormLabel htmlFor="selectAgentLogLevel">
              <FormattedMessage
                id="xpack.fleet.agentLogs.selectLogLevelLabelText"
                defaultMessage="Agent logging level"
              />
            </EuiFormLabel>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSelect
              disabled={isSetLevelLoading || !authz.fleet.allAgents}
              compressed={true}
              id="selectAgentLogLevel"
              data-test-subj="selectAgentLogLevel"
              value={selectedLogLevel}
              onChange={(event) => {
                setSelectedLogLevel(event.target.value);
              }}
              options={AGENT_LOG_LEVELS.map((level) => ({
                value: level,
                text: level,
              }))}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              flush="both"
              size="xs"
              disabled={!authz.fleet.allAgents}
              isLoading={isSetLevelLoading || isResetLevelLoading}
              iconType="check"
              onClick={onClickApply}
              data-test-subj="applyLogLevelBtn"
            >
              {isSetLevelLoading ? (
                <FormattedMessage
                  id="xpack.fleet.agentLogs.updateButtonLoadingText"
                  defaultMessage="Applying changes..."
                />
              ) : (
                <FormattedMessage
                  id="xpack.fleet.agentLogs.updateButtonText"
                  defaultMessage="Apply changes"
                />
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
          {canResetLogLevel && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                flush="both"
                size="xs"
                disabled={!authz.fleet.allAgents}
                isLoading={isSetLevelLoading || isResetLevelLoading}
                iconType="cross"
                onClick={resetLogLevel}
                data-test-subj="resetLogLevelBtn"
              >
                <FormattedMessage
                  id="xpack.fleet.agentLogs.resetLogLevelLabelText"
                  defaultMessage="Reset to policy"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </>
    );
  }
);
