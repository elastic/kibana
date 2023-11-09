/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiIconTip } from '@elastic/eui';

import type { AgentUpgradeDetails } from '../../../../../../../common/types';

/**
 * Returns a user-friendly string for the estimated remaining time until the upgrade is scheduled.
 */
export function getUpgradeStartDelay(scheduledAt?: string): string {
  const timeDiffMillis = Date.parse(scheduledAt || '') - Date.now();

  if (timeDiffMillis < 0) {
    // The scheduled time should not be in the past, this would indicate an issue.
    // We choose not to provide a time estimation rather than negative duration.
    return '';
  }

  if (timeDiffMillis < 15 * 6e4) {
    return ' The upgrade will start in less than 15 minutes.';
  }
  if (timeDiffMillis < 30 * 6e4) {
    return ' The upgrade will start in less than 30 minutes.';
  }
  if (timeDiffMillis < 60 * 6e4) {
    return ' The upgrade will start in less than 1 hour.';
  }
  return ` The upgrade will start in less than ${Math.ceil(timeDiffMillis / 36e5)} hours.`;
}

export function getDownloadEstimate(downloadPercent?: number): string {
  if (!downloadPercent || downloadPercent === 0) {
    return '';
  }

  return ` (${downloadPercent}%)`;
}

function getStatusComponents(agentUpgradeDetails?: AgentUpgradeDetails) {
  switch (agentUpgradeDetails?.state) {
    case 'UPG_REQUESTED':
      return {
        Badge: (
          <EuiBadge color="accent" iconType="calendar">
            <FormattedMessage
              id="xpack.fleet.agentUpgradeStatusBadge.upgradeRequested"
              defaultMessage="Upgrade requested"
            />
          </EuiBadge>
        ),
        TooltipText: (
          <FormattedMessage
            id="xpack.fleet.agentUpgradeStatusTooltip.upgradeRequested"
            defaultMessage="The agent has requested an upgrade."
          />
        ),
      };
    case 'UPG_SCHEDULED':
      return {
        Badge: (
          <EuiBadge color="accent" iconType="clock">
            <FormattedMessage
              id="xpack.fleet.agentUpgradeStatusBadge.upgradeScheduled"
              defaultMessage="Upgrade scheduled"
            />
          </EuiBadge>
        ),
        TooltipText: (
          <FormattedMessage
            id="xpack.fleet.agentUpgradeStatusTooltip.upgradeScheduled"
            defaultMessage="The agent has been instructed to upgrade.{upgradeStartDelay}"
            values={{
              upgradeStartDelay: getUpgradeStartDelay(agentUpgradeDetails.metadata?.scheduled_at),
            }}
          />
        ),
      };
    case 'UPG_DOWNLOADING':
      return {
        Badge: (
          <EuiBadge color="accent" iconType="download">
            <FormattedMessage
              id="xpack.fleet.agentUpgradeStatusBadge.upgradeDownloading"
              defaultMessage="Upgrade downloading"
            />
          </EuiBadge>
        ),
        TooltipText: (
          <FormattedMessage
            id="xpack.fleet.agentUpgradeStatusTooltip.upgradeDownloading"
            defaultMessage="Downloading the new agent artifact version{downloadEstimate}."
            values={{
              downloadEstimate: getDownloadEstimate(
                agentUpgradeDetails?.metadata?.download_percent
              ),
            }}
          />
        ),
      };
    case 'UPG_EXTRACTING':
      return {
        Badge: (
          <EuiBadge color="accent" iconType="package">
            <FormattedMessage
              id="xpack.fleet.agentUpgradeStatusBadge.upgradeExtracting"
              defaultMessage="Upgrade extracting"
            />
          </EuiBadge>
        ),
        TooltipText: (
          <FormattedMessage
            id="xpack.fleet.agentUpgradeStatusTooltip.upgradeExtracting"
            defaultMessage="The new agent artifact is extracting."
          />
        ),
      };
    case 'UPG_REPLACING':
      return {
        Badge: (
          <EuiBadge color="warning" iconType="copy">
            <FormattedMessage
              id="xpack.fleet.agentUpgradeStatusBadge.upgradeReplacing"
              defaultMessage="Upgrade replacing"
            />
          </EuiBadge>
        ),
        TooltipText: (
          <FormattedMessage
            id="xpack.fleet.agentUpgradeStatusTooltip.upgradeReplacing"
            defaultMessage="Replacing the agent artifact version."
          />
        ),
      };
    case 'UPG_RESTARTING':
      return {
        Badge: (
          <EuiBadge color="warning" iconType="refresh">
            <FormattedMessage
              id="xpack.fleet.agentUpgradeStatusBadge.upgradeRestarting"
              defaultMessage="Upgrade restarting"
            />
          </EuiBadge>
        ),
        TooltipText: (
          <FormattedMessage
            id="xpack.fleet.agentUpgradeStatusTooltip.upgradeRestarting"
            defaultMessage="The agent is restarting to apply the update."
          />
        ),
      };
    case 'UPG_WATCHING':
      return {
        Badge: (
          <EuiBadge color="warning" iconType="inspect">
            <FormattedMessage
              id="xpack.fleet.agentUpgradeStatusBadge.upgradeMonitoring"
              defaultMessage="Upgrade monitoring"
            />
          </EuiBadge>
        ),
        TooltipText: (
          <FormattedMessage
            id="xpack.fleet.agentUpgradeStatusTooltip.upgradeMonitoring"
            defaultMessage="Monitoring the new agent version for errors."
          />
        ),
      };
    case 'UPG_ROLLBACK':
      return {
        Badge: (
          <EuiBadge color="danger" iconType="returnKey">
            <FormattedMessage
              id="xpack.fleet.agentUpgradeStatusBadge.upgradeRolledBack"
              defaultMessage="Upgrade rolled back"
            />
          </EuiBadge>
        ),
        TooltipText: (
          <FormattedMessage
            id="xpack.fleet.agentUpgradeStatusTooltip.upgradeRolledBack"
            defaultMessage="Upgrade unsuccessful. Rolling back to previous version."
          />
        ),
      };
    case 'UPG_FAILED':
      return {
        Badge: (
          <EuiBadge color="danger" iconType="error">
            <FormattedMessage
              id="xpack.fleet.agentUpgradeStatusBadge.upgradeFailed"
              defaultMessage="Upgrade failed"
            />
          </EuiBadge>
        ),
        TooltipText: (
          <FormattedMessage
            id="xpack.fleet.agentUpgradeStatusTooltip.upgradeFailed"
            defaultMessage="Upgrade failed: {errorMsg}."
            values={{
              errorMsg: agentUpgradeDetails?.metadata?.error_msg,
            }}
          />
        ),
      };
    default:
      return null;
  }
}

export const AgentUpgradeStatus: React.FC<{
  isAgentUpgradable: boolean;
  agentUpgradeStartedAt?: string | null;
  agentUpgradedAt?: string | null;
  agentUpgradeDetails?: AgentUpgradeDetails;
}> = ({ isAgentUpgradable, agentUpgradeStartedAt, agentUpgradedAt, agentUpgradeDetails }) => {
  const isAgentUpgrading = useMemo(
    () => agentUpgradeStartedAt && !agentUpgradedAt,
    [agentUpgradeStartedAt, agentUpgradedAt]
  );
  const status = useMemo(() => getStatusComponents(agentUpgradeDetails), [agentUpgradeDetails]);
  const minVersion = undefined; // Change this to a string in order for a tooltip to render for upgrading agents with no upgrade details.

  if (isAgentUpgradable) {
    return (
      <EuiBadge color="hollow" iconType="sortUp">
        <FormattedMessage
          id="xpack.fleet.agentUpgradeStatusBadge.upgradeAvailable"
          defaultMessage="Upgrade available"
        />
      </EuiBadge>
    );
  }

  if (agentUpgradeDetails && status) {
    return (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>{status.Badge}</EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIconTip type="iInCircle" content={status.TooltipText} color="subdued" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (minVersion && isAgentUpgrading) {
    return (
      <EuiIconTip
        type="iInCircle"
        content={
          <FormattedMessage
            id="xpack.fleet.agentUpgradeStatusTooltip.upgradeDetailsNotAvailable"
            defaultMessage="Detailed upgrade status is available for Elastic Agents on version {minVersion} and higher."
            values={{
              minVersion,
            }}
          />
        }
        color="subdued"
      />
    );
  }

  return null;
};
