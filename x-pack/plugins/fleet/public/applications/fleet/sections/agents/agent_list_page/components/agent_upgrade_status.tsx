/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
// import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiIconTip } from '@elastic/eui';

import type { AgentUpgradeDetails } from '../../../../../../../common/types';

function getUpgradeStartDelay(scheduledAt?: string) {
  return Math.round((Date.parse(scheduledAt || '') - Date.now()) / 36e5);
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
            defaultMessage="The agent has been instructed to upgrade. The upgrade will start in {scheduledAt} hours."
            values={{
              scheduledAt: getUpgradeStartDelay(agentUpgradeDetails.metadata.scheduled_at),
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
            defaultMessage="Downloading the new agent artifact version ({downloadPercent}%)."
            values={{
              downloadPercent: agentUpgradeDetails?.metadata.download_percent,
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
              errorMsg: agentUpgradeDetails?.metadata.error_msg,
            }}
          />
        ),
      };
    default:
      return null;
  }
}

export const AgentUpgradeStatus: React.FC<{
  agentUpgradeStartedAt?: string | null;
  agentUpgradedAt?: string | null;
  agentUpgradeDetails?: AgentUpgradeDetails;
}> = ({ agentUpgradeStartedAt, agentUpgradedAt, agentUpgradeDetails }) => {
  const isAgentUpgrading = useMemo(
    () => agentUpgradeStartedAt && !agentUpgradedAt,
    [agentUpgradeStartedAt, agentUpgradedAt]
  );
  const status = useMemo(() => getStatusComponents(agentUpgradeDetails), [agentUpgradeDetails]);

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

  if (isAgentUpgrading) {
    return (
      <EuiIconTip
        type="iInCircle"
        content={
          <FormattedMessage
            id="xpack.fleet.agentUpgradeStatusTooltip.upgradeDetailsNotAvailable"
            defaultMessage="Detailed upgrade status is available for Elastic Agents on version 8.11 and higher."
          />
        }
        color="subdued"
      />
    );
  }

  return null;
};
