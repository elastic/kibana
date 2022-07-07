/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiConfirmModal,
  EuiComboBox,
  EuiFormRow,
  EuiSpacer,
  EuiToolTip,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCallOut,
  EuiDatePicker,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { EuiComboBoxOptionOption } from '@elastic/eui';

import semverCoerce from 'semver/functions/coerce';
import semverGt from 'semver/functions/gt';
import semverValid from 'semver/functions/valid';

import { getMinVersion } from '../../../../../../../common/services/get_min_max_version';
import type { Agent } from '../../../../types';
import {
  sendPostAgentUpgrade,
  sendPostBulkAgentUpgrade,
  useStartServices,
  useKibanaVersion,
} from '../../../../hooks';

import { FALLBACK_VERSIONS, MAINTAINANCE_VALUES } from './constants';
import { useScheduleDateTime } from './hooks';

export interface AgentUpgradeAgentModalProps {
  onClose: () => void;
  agents: Agent[] | string;
  agentCount: number;
  isScheduled?: boolean;
}

const getVersion = (version: Array<EuiComboBoxOptionOption<string>>) => version[0]?.value as string;

export const AgentUpgradeAgentModal: React.FunctionComponent<AgentUpgradeAgentModalProps> = ({
  onClose,
  agents,
  agentCount,
  isScheduled = false,
}) => {
  const { notifications } = useStartServices();
  const kibanaVersion = useKibanaVersion();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string | undefined>();

  const isSingleAgent = Array.isArray(agents) && agents.length === 1;
  const isSmallBatch = agentCount <= 10;
  const isAllAgents = agents === '';

  const fallbackVersions = useMemo(
    () => [kibanaVersion].concat(FALLBACK_VERSIONS),
    [kibanaVersion]
  );

  const minVersion = useMemo(() => {
    if (!Array.isArray(agents)) {
      return getMinVersion(fallbackVersions);
    }
    const versions = (agents as Agent[]).map(
      (agent) => agent.local_metadata?.elastic?.agent?.version
    );
    return getMinVersion(versions);
  }, [agents, fallbackVersions]);

  const versionOptions: Array<EuiComboBoxOptionOption<string>> = useMemo(() => {
    const displayVersions = minVersion
      ? fallbackVersions.filter((v) => semverGt(v, minVersion))
      : fallbackVersions;
    const options = displayVersions.map((option) => ({
      label: option,
      value: option,
    }));
    if (options.length === 0) {
      return [{ label: '', value: '' }];
    }
    return options;
  }, [fallbackVersions, minVersion]);
  const noVersions = versionOptions[0]?.value === '';

  const maintainanceOptions: Array<EuiComboBoxOptionOption<number>> = MAINTAINANCE_VALUES.map(
    (option) => ({
      label:
        option === 0
          ? i18n.translate('xpack.fleet.upgradeAgents.noMaintainanceWindowOption', {
              defaultMessage: 'Immediately',
            })
          : i18n.translate('xpack.fleet.upgradeAgents.hourLabel', {
              defaultMessage: '{option} {count, plural, one {hour} other {hours}}',
              values: { option, count: option === 1 },
            }),
      value: option === 0 ? 0 : option * 3600,
    })
  );
  const [selectedVersion, setSelectedVersion] = useState([versionOptions[0]]);
  const [selectedMantainanceWindow, setSelectedMantainanceWindow] = useState([
    isSmallBatch ? maintainanceOptions[0] : maintainanceOptions[1],
  ]);

  const { startDatetime, onChangeStartDateTime, initialDatetime, minTime, maxTime } =
    useScheduleDateTime();

  async function onSubmit() {
    const version = getVersion(selectedVersion);
    const rolloutOptions = {
      rollout_duration_seconds:
        selectedMantainanceWindow.length > 0 && (selectedMantainanceWindow[0]?.value as number) > 0
          ? selectedMantainanceWindow[0].value
          : undefined,
      start_time: startDatetime.toISOString(),
    };

    try {
      setIsSubmitting(true);
      const { data, error } = isSingleAgent
        ? await sendPostAgentUpgrade((agents[0] as Agent).id, {
            version,
          })
        : await sendPostBulkAgentUpgrade({
            version,
            agents: Array.isArray(agents) ? agents.map((agent) => agent.id) : agents,
            ...rolloutOptions,
          });
      if (error) {
        if (error?.statusCode === 400) {
          setErrors(error?.message);
        }
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
            defaultMessage: 'Upgrading {count} agent',
            values: { count: 1 },
          })
        : i18n.translate('xpack.fleet.upgradeAgents.successMultiNotificationTitle', {
            defaultMessage:
              'Upgrading {isMixed, select, true {{success} of {total}} other {{isAllAgents, select, true {all selected} other {{success}} }}} agents',
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

  const onCreateOption = (searchValue: string) => {
    if (!semverValid(searchValue)) {
      return;
    }

    const agentVersionNumber = semverCoerce(searchValue);
    if (
      agentVersionNumber?.version &&
      semverGt(kibanaVersion, agentVersionNumber?.version) &&
      minVersion &&
      semverGt(agentVersionNumber?.version, minVersion)
    ) {
      const newOption = {
        label: searchValue,
        value: searchValue,
      };
      setSelectedVersion([newOption]);
    }
  };

  return (
    <EuiConfirmModal
      data-test-subj="agentUpgradeModal"
      title={
        <>
          {isSingleAgent ? (
            <FormattedMessage
              id="xpack.fleet.upgradeAgents.upgradeSingleTitle"
              defaultMessage="Upgrade agent"
            />
          ) : isScheduled ? (
            <FormattedMessage
              id="xpack.fleet.upgradeAgents.scheduleUpgradeMultipleTitle"
              defaultMessage="Schedule upgrade for {count, plural, one {agent} other {{count} agents} =true {all selected agents}}"
              values={{ count: isAllAgents || agentCount }}
            />
          ) : (
            <FormattedMessage
              id="xpack.fleet.upgradeAgents.upgradeMultipleTitle"
              defaultMessage="Upgrade {count, plural, one {agent} other {{count} agents} =true {all selected agents}}"
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
      confirmButtonDisabled={isSubmitting || noVersions}
      confirmButtonText={
        isSingleAgent ? (
          <FormattedMessage
            id="xpack.fleet.upgradeAgents.confirmSingleButtonLabel"
            defaultMessage="Upgrade agent"
          />
        ) : isScheduled ? (
          <FormattedMessage
            id="xpack.fleet.upgradeAgents.confirmScheduleMultipleButtonLabel"
            defaultMessage="Schedule"
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
        {noVersions ? (
          <FormattedMessage
            id="xpack.fleet.upgradeAgents.noVersionsText"
            defaultMessage="No selected agents are eligible for an upgrade. Please select one or more eligible agents."
          />
        ) : isSingleAgent ? (
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
      <EuiFormRow
        label={i18n.translate('xpack.fleet.upgradeAgents.chooseVersionLabel', {
          defaultMessage: 'Upgrade version',
        })}
        fullWidth
      >
        <EuiComboBox
          data-test-subj="agentUpgradeModal.VersionCombobox"
          fullWidth
          singleSelection={{ asPlainText: true }}
          options={versionOptions}
          isDisabled={noVersions}
          isClearable={false}
          selectedOptions={selectedVersion}
          onChange={(selected: Array<EuiComboBoxOptionOption<string>>) => {
            if (!selected.length) {
              return;
            }
            setSelectedVersion(selected);
          }}
          onCreateOption={onCreateOption}
          customOptionText="Input the desired version"
        />
      </EuiFormRow>
      {!isSingleAgent ? (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            color="warning"
            title={i18n.translate('xpack.fleet.upgradeAgents.warningCallout', {
              defaultMessage: 'Rolling upgrade only available for Elastic Agent versions 8.3+',
            })}
          />
        </>
      ) : null}
      {isScheduled && (
        <>
          <EuiSpacer size="m" />
          <EuiFormRow
            label={i18n.translate('xpack.fleet.upgradeAgents.startTimeLabel', {
              defaultMessage: 'Scheduled date and time',
            })}
            fullWidth
          >
            <EuiDatePicker
              data-test-subj="agentUpgradeModal.startTimeDatePicker"
              fullWidth
              required
              showTimeSelect
              selected={startDatetime}
              minDate={initialDatetime}
              minTime={minTime}
              maxTime={maxTime}
              onChange={onChangeStartDateTime}
            />
          </EuiFormRow>
        </>
      )}
      <EuiSpacer size="m" />
      {!isSingleAgent ? (
        <EuiFormRow
          label={
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem grow={false}>
                {i18n.translate('xpack.fleet.upgradeAgents.maintainanceAvailableLabel', {
                  defaultMessage: 'Maintenance window available',
                })}
              </EuiFlexItem>
              <EuiSpacer size="xs" />
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  position="top"
                  content={i18n.translate(
                    'xpack.fleet.upgradeAgents.maintainanceAvailableTooltip',
                    {
                      defaultMessage:
                        'Defines the duration of time available to perform the upgrade. The agent upgrades are spread uniformly across this duration in order to avoid exhausting network resources.',
                    }
                  )}
                >
                  <EuiIcon type="iInCircle" title="TooltipIcon" />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          fullWidth
        >
          <EuiComboBox
            data-test-subj="agentUpgradeModal.MaintainanceCombobox"
            fullWidth
            isClearable={false}
            singleSelection={{ asPlainText: true }}
            options={maintainanceOptions}
            selectedOptions={selectedMantainanceWindow}
            onChange={(selected: Array<EuiComboBoxOptionOption<number>>) => {
              if (!selected.length) {
                return;
              }
              setSelectedMantainanceWindow(selected);
            }}
          />
        </EuiFormRow>
      ) : null}
      {errors ? (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut
            color="danger"
            title={i18n.translate('xpack.fleet.upgradeAgents.warningCalloutErrors', {
              defaultMessage:
                'Error upgrading the selected {count, plural, one {agent} other {{count} agents}}',
              values: { count: isSingleAgent },
            })}
          />
        </>
      ) : null}
    </EuiConfirmModal>
  );
};
