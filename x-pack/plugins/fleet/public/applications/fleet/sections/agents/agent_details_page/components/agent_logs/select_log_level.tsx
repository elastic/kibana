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

import type { Agent } from '../../../../../types';
import { sendPostAgentAction, useStartServices } from '../../../../../hooks';

import { AGENT_LOG_LEVELS, DEFAULT_LOG_LEVEL } from './constants';

const LEVEL_VALUES = Object.values(AGENT_LOG_LEVELS);

export const SelectLogLevel: React.FC<{ agent: Agent }> = memo(({ agent }) => {
  const { notifications } = useStartServices();
  const [isLoading, setIsLoading] = useState(false);
  const [agentLogLevel, setAgentLogLevel] = useState(
    agent.local_metadata?.elastic?.agent?.log_level ?? DEFAULT_LOG_LEVEL
  );
  const [selectedLogLevel, setSelectedLogLevel] = useState(agentLogLevel);

  const onClickApply = useCallback(() => {
    setIsLoading(true);
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
            defaultMessage: `Changed agent logging level to '{logLevel}'.`,
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
      setIsLoading(false);
    }

    send();
  }, [notifications, selectedLogLevel, agent.id]);

  return (
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
          disabled={isLoading}
          compressed={true}
          id="selectAgentLogLevel"
          value={selectedLogLevel}
          onChange={(event) => {
            setSelectedLogLevel(event.target.value);
          }}
          options={LEVEL_VALUES.map((level) => ({ text: level, value: level }))}
        />
      </EuiFlexItem>
      {agentLogLevel !== selectedLogLevel && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            flush="left"
            size="xs"
            isLoading={isLoading}
            disabled={agentLogLevel === selectedLogLevel}
            iconType="refresh"
            onClick={onClickApply}
          >
            {isLoading ? (
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
      )}
    </EuiFlexGroup>
  );
});
