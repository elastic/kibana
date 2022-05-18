/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiConfirmModal, EuiComboBox, EuiFormRow, EuiSpacer, EuiToolTip, EuiIcon, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { Agent } from '../../../../types';
import {
  sendPostAgentUpgrade,
  sendPostBulkAgentUpgrade,
  useStartServices,
} from '../../../../hooks';
import { FALLBACK_VERSIONS, MAINTAINANCE_WINDOWS } from './constants';

interface Props {
  onClose: () => void;
  agents: Agent[] | string;
  agentCount: number;
}

export const AgentUpgradeAgentModal: React.FunctionComponent<Props> = ({
  onClose,
  agents,
  agentCount,
}) => {
  const { notifications } = useStartServices();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fallbackVersions: Array<EuiComboBoxOptionOption<string>> = FALLBACK_VERSIONS.map((option) => ({
    label: option,
    value: option,
  }));
  const maintainanceOptions: Array<EuiComboBoxOptionOption<string>> = MAINTAINANCE_WINDOWS.map((option) => ({
    label: option === 1 ? `${option} hour` : `${option} hours`,
    value: `${option * 3600}`
  }));
  const [selectedVersion, setSelectedVersion] = useState([fallbackVersions[0]]);
  const [selectedMantainanceWindow, setSelectedMantainanceWindow] = useState([maintainanceOptions[0]]);
  const isSingleAgent = Array.isArray(agents) && agents.length === 1;
  const isAllAgents = agents === '';

  const getVersion = (selectedVersion: EuiComboBoxOptionOption<string>[]) => selectedVersion[0].value as string;
  const getRolloutDuration = (selectedMantainanceWindow: EuiComboBoxOptionOption<string>[]) =>  Number(selectedMantainanceWindow[0].value)

  async function onSubmit() {
    const version = getVersion(selectedVersion);
    try {
      setIsSubmitting(true);
      const { data, error } = isSingleAgent
        ? await sendPostAgentUpgrade((agents[0] as Agent).id, {
            version,
          })
        : await sendPostBulkAgentUpgrade({
            agents: Array.isArray(agents) ? agents.map((agent) => agent.id) : agents,
            version,
            rollout_duration_seconds: getRolloutDuration(selectedMantainanceWindow)
          });
      if (error) {
        throw error;
      }

      const counts = Object.entries(data || {}).reduce(
        (acc, [agentId, result]) => {
          ++acc.total;
          ++acc[result.success ? 'success' : 'error'];
          return acc;
        },
        {
          total: 0,
          success: 0,
          error: 0,
        }
      );
      setIsSubmitting(false);
      const successMessage = isSingleAgent
        ? i18n.translate('xpack.fleet.upgradeAgents.successSingleNotificationTitle', {
            defaultMessage: 'Upgraded {count} agent',
            values: { count: 1 },
          })
        : i18n.translate('xpack.fleet.upgradeAgents.successMultiNotificationTitle', {
            defaultMessage:
              'Upgraded {isMixed, select, true {{success} of {total}} other {{isAllAgents, select, true {all selected} other {{success}} }}} agents',
            values: {
              isMixed: counts.success !== counts.total,
              success: counts.success,
              total: counts.total,
              isAllAgents,
            },
          });
      if (counts.success === counts.total) {
        notifications.toasts.addSuccess(successMessage);
      } else if (counts.error === counts.total) {
        notifications.toasts.addDanger(
          i18n.translate('xpack.fleet.upgradeAgents.bulkResultAllErrorsNotificationTitle', {
            defaultMessage:
              'Error upgrading {count, plural, one {agent} other {{count} agents} =true {all selected agents}}',
            values: { count: isAllAgents || agentCount },
          })
        );
      } else {
        notifications.toasts.addWarning({
          title: successMessage,
          text: i18n.translate('xpack.fleet.upgradeAgents.bulkResultErrorResultsSummary', {
            defaultMessage:
              '{count} {count, plural, one {agent was} other {agents were}} not successful',
            values: { count: counts.error },
          }),
        });
      }
      onClose();
    } catch (error) {
      setIsSubmitting(false);
      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.fleet.upgradeAgents.fatalErrorNotificationTitle', {
          defaultMessage:
            'Error upgrading {count, plural, one {agent} other {{count} agents} =true {all selected agents}}',
          values: { count: isAllAgents || agentCount },
        }),
      });
    }
  }

  return (
    <EuiConfirmModal
      data-test-subj="agentUpgradeModal"
      title={
        <>
          {isSingleAgent ? (
            <FormattedMessage
              id="xpack.fleet.upgradeAgents.upgradeSingleTitle"
              defaultMessage="Upgrade agent to latest version"
            />
          ) : (
            <FormattedMessage
              id="xpack.fleet.upgradeAgents.upgradeMultipleTitle"
              defaultMessage="Upgrade {count, plural, one {agent} other {{count} agents} =true {all selected agents}} to latest version"
              values={{ count: isAllAgents || agentCount }}
            />
          )}
        </>
      }
      onCancel={onClose}
      onConfirm={onSubmit}
      cancelButtonText={
        <FormattedMessage
          id="xpack.fleet.upgradeAgents.cancelButtonLabel"
          defaultMessage="Cancel"
        />
      }
      confirmButtonDisabled={isSubmitting}
      confirmButtonText={
        isSingleAgent ? (
          <FormattedMessage
            id="xpack.fleet.upgradeAgents.confirmSingleButtonLabel"
            defaultMessage="Upgrade agent"
          />
        ) : (
          <FormattedMessage
            id="xpack.fleet.upgradeAgents.confirmMultipleButtonLabel"
            defaultMessage="Upgrade {count, plural, one {agent} other {{count} agents} =true {all selected agents}}"
            values={{ count: isAllAgents || agentCount }}
          />
        )
      }
    >
     <p>
        {isSingleAgent ? (
          <FormattedMessage
            id="xpack.fleet.upgradeAgents.upgradeSingleDescription"
            defaultMessage="This action will upgrade the agent running on '{hostName}' to version {version}. This action can not be undone. Are you sure you wish to continue?"
            values={{
              hostName: ((agents[0] as Agent).local_metadata.host as any).hostname,
              version: getVersion(selectedVersion),
            }}
          />
        ) : (
          <FormattedMessage
            id="xpack.fleet.upgradeAgents.upgradeMultipleDescription"
            defaultMessage="This action will upgrade multiple agents to version {version}. This action can not be undone. Are you sure you wish to continue?"
            values={{ version: getVersion(selectedVersion) }}
          />
        )}
      </p>
      <EuiSpacer size="m" />
      <EuiFormRow
        label= {i18n.translate(
          'xpack.fleet.upgradeAgents.chooseVersionLabel',
          {
            defaultMessage: 'Upgrade version',
          }
        )}
        fullWidth
      >
        <EuiComboBox
          fullWidth
          singleSelection={{ asPlainText: true }}
          options={fallbackVersions}
          selectedOptions={selectedVersion}
          onChange={(selected: Array<EuiComboBoxOptionOption<string>>) => {
            setSelectedVersion(selected);
          }}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      { !isSingleAgent ?
        <EuiFormRow
          label= {
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={false}>
                {i18n.translate(
                  'xpack.fleet.upgradeAgents.maintainanceAvailableLabel',
                  {
                    defaultMessage: 'Maintainance window available',
                  }
                )}
              </EuiFlexItem>
              <EuiSpacer size="xs" />
              <EuiFlexItem grow={false}>
                <EuiToolTip position="top" content={i18n.translate(
                  'xpack.fleet.upgradeAgents.maintainanceAvailableTooltip',
                  {
                    defaultMessage: 'Defines the duration of time available to perform the upgrade. The agent upgrades are spread uniformly across this duration in order to avoid exhausting network resources.',
                  }
                )}>
                  <EuiIcon type="iInCircle" title="TooltipIcon" />
                </EuiToolTip>
              </EuiFlexItem>
          </EuiFlexGroup>
        }
          fullWidth
        >
          <EuiComboBox
            fullWidth
            singleSelection={{ asPlainText: true }}
            options={maintainanceOptions}
            selectedOptions={selectedMantainanceWindow}
            onChange={(selected: Array<EuiComboBoxOptionOption<string>>) => {
              setSelectedMantainanceWindow(selected);
            }}
          />
        </EuiFormRow>
        : null
      }

    </EuiConfirmModal>
  );
};
