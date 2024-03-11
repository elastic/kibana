/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useEffect } from 'react';
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
  EuiFieldText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { EuiComboBoxOptionOption } from '@elastic/eui';

import semverGt from 'semver/functions/gt';
import semverLt from 'semver/functions/lt';

import { AGENT_UPGRADE_COOLDOWN_IN_MIN } from '../../../../../../../common/services';

import { getMinVersion } from '../../../../../../../common/services/get_min_max_version';
import {
  AGENT_UPDATING_TIMEOUT_HOURS,
  isStuckInUpdating,
} from '../../../../../../../common/services/agent_status';

import type { Agent } from '../../../../types';
import {
  sendPostAgentUpgrade,
  sendPostBulkAgentUpgrade,
  useStartServices,
  useKibanaVersion,
  useConfig,
  sendGetAgentStatus,
  useAgentVersion,
} from '../../../../hooks';

import { sendGetAgentsAvailableVersions } from '../../../../hooks';
import {
  differsOnlyInPatch,
  getNotUpgradeableMessage,
  isAgentUpgradeableToVersion,
} from '../../../../../../../common/services/is_agent_upgradeable';

import {
  FALLBACK_VERSIONS,
  MAINTENANCE_VALUES,
  ROLLING_UPGRADE_MINIMUM_SUPPORTED_VERSION,
} from './constants';
import { useScheduleDateTime } from './hooks';

export interface AgentUpgradeAgentModalProps {
  onClose: () => void;
  agents: Agent[] | string;
  agentCount: number;
  isScheduled?: boolean;
  isUpdating?: boolean;
}

const getVersion = (version: Array<EuiComboBoxOptionOption<string>>) => version[0]?.value as string;

function isVersionUnsupported(version?: string) {
  if (!version) {
    return false;
  }

  return semverLt(version, ROLLING_UPGRADE_MINIMUM_SUPPORTED_VERSION);
}

export const AgentUpgradeAgentModal: React.FunctionComponent<AgentUpgradeAgentModalProps> = ({
  onClose,
  agents,
  agentCount,
  isScheduled = false,
  isUpdating = false,
}) => {
  const { notifications } = useStartServices();
  const kibanaVersion = useKibanaVersion() || '';
  const config = useConfig();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string | undefined>();
  const [availableVersions, setVersions] = useState<string[]>([]);

  const isSingleAgent = Array.isArray(agents) && agents.length === 1;
  const isSmallBatch = agentCount <= 10;
  const isAllAgents = agents === '';

  const [updatingAgents, setUpdatingAgents] = useState<number>(0);
  const [updatingQuery, setUpdatingQuery] = useState<Agent[] | string>('');

  const QUERY_STUCK_UPDATING = `status:updating AND upgrade_started_at:* AND NOT upgraded_at:* AND upgrade_started_at < now-${AGENT_UPDATING_TIMEOUT_HOURS}h`;
  const EMPTY_VALUE = useMemo(() => ({ label: '', value: '' }), []);
  const [isInvalid, setIsInvalid] = useState(false);

  useEffect(() => {
    const getStuckUpdatingAgentCount = async (agentsOrQuery: Agent[] | string) => {
      let newQuery;
      // find updating agents from array
      if (Array.isArray(agentsOrQuery) && agentsOrQuery.length > 0) {
        if (agentsOrQuery.length === 0) {
          return;
        }
        const newAgents = agentsOrQuery.filter((agent) => isStuckInUpdating(agent));
        const updatingCount = newAgents.length;
        setUpdatingAgents(updatingCount);
        setUpdatingQuery(newAgents);
        return;
      } else if (typeof agentsOrQuery === 'string' && agentsOrQuery !== '') {
        newQuery = [`(${agentsOrQuery})`, QUERY_STUCK_UPDATING].join(' AND ');
      } else {
        newQuery = QUERY_STUCK_UPDATING;
      }
      setUpdatingQuery(newQuery);

      // if selection is a query, do an api call to get updating agents
      try {
        const res = await sendGetAgentStatus({
          kuery: newQuery,
        });
        setUpdatingAgents(res?.data?.results?.updating ?? 0);
      } catch (err) {
        return;
      }
    };
    if (!isUpdating) return;

    getStuckUpdatingAgentCount(agents);
  }, [isUpdating, setUpdatingQuery, QUERY_STUCK_UPDATING, agents]);

  useEffect(() => {
    const getVersions = async () => {
      try {
        const res = await sendGetAgentsAvailableVersions();
        // if the endpoint returns an error, use the fallback versions
        const versionsList = res?.data?.items ? res.data.items : FALLBACK_VERSIONS;

        setVersions(versionsList);
      } catch (err) {
        return;
      }
    };

    getVersions();
  }, [kibanaVersion]);

  const minVersion = useMemo(() => {
    if (!Array.isArray(agents)) {
      // when agent is a query, don't set minVersion, so the versions are available to select
      if (typeof agents === 'string') {
        return undefined;
      }
      return getMinVersion(availableVersions);
    }
    const versions = (agents as Agent[]).map(
      (agent) => agent.local_metadata?.elastic?.agent?.version
    );
    return getMinVersion(versions);
  }, [agents, availableVersions]);

  const versionOptions: Array<EuiComboBoxOptionOption<string>> = useMemo(() => {
    const displayVersions = minVersion
      ? availableVersions.filter(
          (v) => semverGt(v, minVersion) || differsOnlyInPatch(v, minVersion, false)
        )
      : availableVersions;

    const options = displayVersions.map((option) => ({
      label: option,
      value: option,
    }));
    if (options.length === 0) {
      return [EMPTY_VALUE];
    }
    return options;
  }, [availableVersions, minVersion, EMPTY_VALUE]);
  const noVersions = !availableVersions || versionOptions[0]?.value === '';

  const maintenanceOptions: Array<EuiComboBoxOptionOption<number>> = MAINTENANCE_VALUES.map(
    (option) => ({
      label:
        option === 0
          ? i18n.translate('xpack.fleet.upgradeAgents.noMaintenanceWindowOption', {
              defaultMessage: 'Immediately',
            })
          : i18n.translate('xpack.fleet.upgradeAgents.hourLabel', {
              defaultMessage: '{option} {count, plural, one {hour} other {hours}}',
              values: { option, count: option === 1 },
            }),
      value: option === 0 ? 0 : option * 3600,
    })
  );
  const preselected: Array<EuiComboBoxOptionOption<string>> = [
    {
      label: kibanaVersion,
      value: kibanaVersion,
    },
  ];
  const [selectedVersion, setSelectedVersion] = useState(preselected);

  const [selectedVersionStr, setSelectedVersionStr] = useState('');

  // latest agent version might be earlier than kibana version
  const latestAgentVersion = useAgentVersion();
  useEffect(() => {
    if (latestAgentVersion) {
      setSelectedVersion([
        {
          label: latestAgentVersion,
          value: latestAgentVersion,
        },
      ]);
    }
  }, [latestAgentVersion]);

  const [selectedMaintenanceWindow, setSelectedMaintenanceWindow] = useState([
    isSmallBatch ? maintenanceOptions[0] : maintenanceOptions[1],
  ]);

  const { startDatetime, onChangeStartDateTime, initialDatetime, minTime, maxTime } =
    useScheduleDateTime();

  async function onSubmit() {
    const version = getVersion(selectedVersion);
    const rolloutOptions = {
      rollout_duration_seconds:
        selectedMaintenanceWindow.length > 0 && (selectedMaintenanceWindow[0]?.value as number) > 0
          ? selectedMaintenanceWindow[0].value
          : undefined,
      start_time: startDatetime.toISOString(),
    };

    try {
      setIsSubmitting(true);
      const getQuery = (agentsOrQuery: Agent[] | string) =>
        Array.isArray(agentsOrQuery) ? agentsOrQuery.map((agent) => agent.id) : agentsOrQuery;
      const { error } =
        isSingleAgent &&
        !isScheduled &&
        isAgentUpgradeableToVersion(agents[0], selectedVersion[0].value)
          ? await sendPostAgentUpgrade((agents[0] as Agent).id, {
              version,
              force: isUpdating,
            })
          : await sendPostBulkAgentUpgrade({
              version,
              agents: getQuery(isUpdating ? updatingQuery : agents),
              force: isUpdating,
              includeInactive: true,
              ...rolloutOptions,
            });
      if (error) {
        if (error?.statusCode === 400) {
          setErrors(error?.message);
        }
        throw error;
      }

      setIsSubmitting(false);

      notifications.toasts.addSuccess(
        i18n.translate('xpack.fleet.upgradeAgents.successNotificationTitle', {
          defaultMessage: 'Upgrading agent(s)',
        })
      );
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
    const normalizedSearchValue = searchValue.trim();

    const newOption = {
      label: normalizedSearchValue,
      value: normalizedSearchValue,
    };
    setSelectedVersion([newOption]);
    setIsInvalid(!normalizedSearchValue);
  };

  return (
    <EuiConfirmModal
      data-test-subj="agentUpgradeModal"
      title={
        <>
          {isSingleAgent ? (
            isUpdating ? (
              <FormattedMessage
                id="xpack.fleet.upgradeAgents.restartUpgradeSingleTitle"
                defaultMessage="Restart upgrade"
              />
            ) : (
              <FormattedMessage
                id="xpack.fleet.upgradeAgents.upgradeSingleTitle"
                defaultMessage="Upgrade agent"
              />
            )
          ) : isScheduled ? (
            <FormattedMessage
              id="xpack.fleet.upgradeAgents.scheduleUpgradeMultipleTitle"
              defaultMessage="Schedule upgrade for {count, plural, one {agent} other {{count} agents} =true {all selected agents}}"
              values={{ count: isAllAgents || agentCount }}
            />
          ) : isUpdating ? (
            <FormattedMessage
              id="xpack.fleet.upgradeAgents.restartUpgradeMultipleTitle"
              defaultMessage="Restart upgrade on {updating} out of {count, plural, one {agent} other {{count} agents} =true {all agents}} stuck in updating"
              values={{ count: isAllAgents || agentCount, updating: updatingAgents }}
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
      confirmButtonDisabled={
        isSubmitting ||
        (isUpdating && updatingAgents === 0) ||
        !selectedVersion[0].value ||
        (isSingleAgent && !isAgentUpgradeableToVersion(agents[0], selectedVersion[0].value))
      }
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
        ) : isUpdating ? (
          <FormattedMessage
            id="xpack.fleet.upgradeAgents.restartConfirmMultipleButtonLabel"
            defaultMessage="Restart upgrade {count, plural, one {agent} other {{count} agents} =true {all selected agents}}"
            values={{ count: updatingAgents }}
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
            defaultMessage="No newer versions found to upgrade to. You may type in a custom version."
          />
        ) : isSingleAgent ? (
          selectedVersion[0].value &&
          !isAgentUpgradeableToVersion(agents[0], selectedVersion[0].value) ? (
            <EuiCallOut
              data-test-subj="agentUpgradeModal.notUpgradeableCallout"
              color="warning"
              iconType="warning"
              title={
                <FormattedMessage
                  id="xpack.fleet.upgradeAgents.notUpgradeable"
                  defaultMessage="The selected agent is not upgradeable."
                />
              }
            >
              <FormattedMessage
                id="xpack.fleet.upgradeAgents.notUpgradeableMsg"
                defaultMessage="Reason: {reason}"
                values={{
                  reason: getNotUpgradeableMessage(
                    agents[0],
                    latestAgentVersion,
                    selectedVersion[0].value
                  ),
                }}
              />
            </EuiCallOut>
          ) : (
            <>
              <p>
                <FormattedMessage
                  id="xpack.fleet.upgradeAgents.upgradeSingleDescription"
                  defaultMessage="This action will upgrade the agent running on '{hostName}'{version}. This action can not be undone. Are you sure you wish to continue?"
                  values={{
                    hostName: ((agents[0] as Agent).local_metadata.host as any).hostname,
                    version: selectedVersion[0].value
                      ? ' to version ' + getVersion(selectedVersion)
                      : '',
                  }}
                />
              </p>
              {isUpdating && (
                <p>
                  <em>
                    <FormattedMessage
                      id="xpack.fleet.upgradeAgents.upgradeSingleTimeout"
                      // TODO: Add link to docs regarding agent upgrade cooldowns
                      defaultMessage="Note that you may only restart an upgrade every {minutes} minutes to ensure that the upgrade will not be rolled back."
                      values={{
                        minutes: AGENT_UPGRADE_COOLDOWN_IN_MIN,
                      }}
                    />
                  </em>
                </p>
              )}
            </>
          )
        ) : (
          <FormattedMessage
            id="xpack.fleet.upgradeAgents.upgradeMultipleDescription"
            defaultMessage="This action will upgrade multiple agents{version}. This action can not be undone. Are you sure you wish to continue?"
            values={{
              version: selectedVersion[0].value ? ' to version ' + getVersion(selectedVersion) : '',
            }}
          />
        )}
      </p>
      <EuiFormRow
        label={i18n.translate('xpack.fleet.upgradeAgents.chooseVersionLabel', {
          defaultMessage: 'Upgrade version',
        })}
        fullWidth
        isInvalid={isInvalid}
        error={
          isInvalid ? (
            <FormattedMessage
              id="xpack.fleet.upgradeAgents.versionRequiredText"
              defaultMessage="Version is required"
            />
          ) : undefined
        }
      >
        {noVersions ? (
          <EuiFieldText
            fullWidth
            placeholder="Enter version"
            value={selectedVersionStr}
            data-test-subj="agentUpgradeModal.VersionInput"
            onChange={(e) => {
              const newValue = e.target.value;
              setSelectedVersionStr(newValue);
              setSelectedVersion([{ label: newValue, value: newValue }]);
            }}
          />
        ) : (
          <EuiComboBox
            data-test-subj="agentUpgradeModal.VersionCombobox"
            fullWidth
            singleSelection={{ asPlainText: true }}
            options={versionOptions}
            isClearable={true}
            selectedOptions={selectedVersion}
            onChange={(selected: Array<EuiComboBoxOptionOption<string>>) => {
              if (!selected.length) {
                setSelectedVersion([EMPTY_VALUE]);
                setIsInvalid(true);
              } else {
                setSelectedVersion(selected);
                setIsInvalid(false);
              }
            }}
            onCreateOption={
              config?.internal?.onlyAllowAgentUpgradeToKnownVersions ? undefined : onCreateOption
            }
            customOptionText="Use custom agent version {searchValue} (not recommended)"
            isInvalid={isInvalid}
          />
        )}
      </EuiFormRow>
      {!isSingleAgent &&
      Array.isArray(agents) &&
      agents.some((agent) =>
        isVersionUnsupported(agent.local_metadata?.elastic?.agent?.version)
      ) ? (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            color="warning"
            title={
              <FormattedMessage
                id="xpack.fleet.upgradeAgents.warningCallout"
                defaultMessage="Rolling upgrades are only available for Elastic Agent versions {version} and higher"
                values={{ version: <strong>{ROLLING_UPGRADE_MINIMUM_SUPPORTED_VERSION}</strong> }}
              />
            }
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
                {i18n.translate('xpack.fleet.upgradeAgents.rolloutPeriodLabel', {
                  defaultMessage: 'Rollout period',
                })}
              </EuiFlexItem>
              <EuiSpacer size="xs" />
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  position="top"
                  content={i18n.translate('xpack.fleet.upgradeAgents.rolloutPeriodTooltip', {
                    defaultMessage:
                      'Define the rollout period for upgrades to your Elastic Agents. Any agents that are offline during this period will be upgraded when they come back online.',
                  })}
                >
                  <EuiIcon type="iInCircle" />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          fullWidth
        >
          <EuiComboBox
            data-test-subj="agentUpgradeModal.MaintenanceCombobox"
            fullWidth
            isClearable={false}
            singleSelection={{ asPlainText: true }}
            options={maintenanceOptions}
            selectedOptions={selectedMaintenanceWindow}
            onChange={(selected: Array<EuiComboBoxOptionOption<number>>) => {
              if (!selected.length) {
                return;
              }
              setSelectedMaintenanceWindow(selected);
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
          >
            <FormattedMessage
              id="xpack.fleet.upgradeAgents.warningCalloutErrorMessage"
              defaultMessage="{originalMessage}"
              values={{
                originalMessage: errors,
              }}
            />
          </EuiCallOut>
        </>
      ) : null}
    </EuiConfirmModal>
  );
};
