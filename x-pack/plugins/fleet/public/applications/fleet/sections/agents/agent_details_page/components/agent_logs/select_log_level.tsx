/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useState, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import semverGte from 'semver/functions/gte';
import { EuiSelect, EuiFormLabel, EuiButtonEmpty, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { Agent } from '../../../../../types';
import { sendPostAgentAction, useStartServices } from '../../../../../hooks';

export const SelectLogLevel: React.FC<{ agent: Agent }> = memo(({ agent }) => {
  const agentVersion = agent.local_metadata?.elastic?.agent?.version;
  const isAvailable = useMemo(() => {
    return semverGte(agentVersion, '7.11.0');
  }, [agentVersion]);

  const { notifications } = useStartServices();
  const [isLoading, setIsLoading] = useState(false);
  const [agentLogLevel, setAgentLogLevel] = useState(
    agent.local_metadata?.elastic?.agent?.log_level ?? 'info'
  );
  const [selectedLogLevel, setSelectedLogLevel] = useState(agentLogLevel);

  if (!isAvailable) {
    return null;
  }

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
          id="selectAgentLogLevel"
          value={selectedLogLevel}
          onChange={(event) => {
            setSelectedLogLevel(event.target.value);
          }}
          options={[
            { text: 'error', value: 'error' },
            { text: 'warning', value: 'warning' },
            { text: 'info', value: 'info' },
            { text: 'debug', value: 'debug' },
          ]}
        />
      </EuiFlexItem>
      {agentLogLevel !== selectedLogLevel && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            flush="left"
            isLoading={isLoading}
            disabled={agentLogLevel === selectedLogLevel}
            iconType="refresh"
            onClick={() => {
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
                      defaultMessage: 'Changed agent logging level to "{logLevel}".',
                      values: {
                        logLevel: selectedLogLevel,
                      },
                    })
                  );
                } catch (error) {
                  notifications.toasts.addError(error, {
                    title: 'Error',
                  });
                }
                setIsLoading(false);
              }

              send();
            }}
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
