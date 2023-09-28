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

import type { AgentStatus, AgentUpgradeDetails } from '../../../../../../../common/types';

function getUpgradeStartDelay(scheduledAt?: string) {
  return Math.round((Date.parse(scheduledAt || '') - Date.now()) / 36e5);
}

function getStatusComponents(agentUpgradeDetails?: AgentUpgradeDetails) {
  switch (agentUpgradeDetails?.state) {
    case 'UPG_SCHEDULED':
      return {
        Badge: (
          <EuiBadge color="warning">
            <FormattedMessage
              id="xpack.fleet.agentUpgradeStatusBadge.upgradeScheduled"
              defaultMessage="Upgrade scheduled"
            />
          </EuiBadge>
        ),
        TooltipText: (
          <FormattedMessage
            id="xpack.fleet.agentUpgradeStatusTooltip.upgradeScheduled"
            defaultMessage="The agent has been instructed to upgrade. The upgrade will start in {scheduledAt} hours." // TODO check message
            values={{
              scheduledAt: getUpgradeStartDelay(agentUpgradeDetails.metadata.scheduled_at),
            }}
          />
        ),
      };
    case 'UPG_DOWNLOADING':
      return {
        Badge: (
          <EuiBadge color="accent">
            <FormattedMessage
              id="xpack.fleet.agentUpgradeStatusBadge.upgradeDownloading"
              defaultMessage="Upgrade downloading"
            />
          </EuiBadge>
        ),
        TooltipText: (
          <FormattedMessage
            id="xpack.fleet.agentUpgradeStatusTooltip.upgradeDownloading"
            defaultMessage="Downloading the new Agent artifact version ({downloadPercent}%)." // TODO check message
            values={{
              downloadPercent: agentUpgradeDetails?.metadata.download_percent,
            }}
          />
        ),
      };
    case 'UPG_REPLACING':
      return {
        Badge: (
          <EuiBadge color="accent">
            <FormattedMessage
              id="xpack.fleet.agentUpgradeStatusBadge.upgradeReplacing"
              defaultMessage="Upgrade replacing"
            />
          </EuiBadge>
        ),
        TooltipText: (
          <FormattedMessage
            id="xpack.fleet.agentUpgradeStatusTooltip.upgradeReplacing"
            defaultMessage="Replacing the Agent artifact version." // TODO check message
          />
        ),
      };
    case 'UPG_WATCHING':
      return {
        Badge: (
          <EuiBadge color="warning">
            <FormattedMessage
              id="xpack.fleet.agentUpgradeStatusBadge.upgradeMonitoring"
              defaultMessage="Upgrade monitoring"
            />
          </EuiBadge>
        ),
        TooltipText: (
          <FormattedMessage
            id="xpack.fleet.agentUpgradeStatusTooltip.upgradeMonitoring"
            defaultMessage="Monitoring new Agent version." // TODO check message
          />
        ),
      };
    case 'UPG_ROLLBACK':
      return {
        Badge: (
          <EuiBadge color="danger">
            <FormattedMessage
              id="xpack.fleet.agentUpgradeStatusBadge.upgradeRolledBack"
              defaultMessage="Upgrade rolled back"
            />
          </EuiBadge>
        ),
        TooltipText: (
          <FormattedMessage
            id="xpack.fleet.agentUpgradeStatusTooltip.upgradeRolledBack"
            defaultMessage="Upgrade unsuccessful. Rolling back to previous version." // TODO check message
          />
        ),
      };
    case 'UPG_FAILED':
      return {
        Badge: (
          <EuiBadge color="danger">
            <FormattedMessage
              id="xpack.fleet.agentUpgradeStatusBadge.upgradeFailed"
              defaultMessage="Upgrade failed"
            />
          </EuiBadge>
        ),
        TooltipText: (
          <FormattedMessage
            id="xpack.fleet.agentUpgradeStatusTooltip.upgradeFailed"
            defaultMessage="Upgrade failed: {errorMsg}" // TODO check message
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
  agentStatus?: AgentStatus;
  agentUpgradeDetails?: AgentUpgradeDetails;
}> = ({ agentStatus, agentUpgradeDetails }) => {
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

  if (agentStatus === 'updating') {
    return (
      <EuiIconTip
        type="iInCircle"
        content={
          <FormattedMessage
            id="xpack.fleet.agentUpgradeStatusTooltip.upgradeDetailsNotAvailable"
            defaultMessage="Agent upgrade details are available from version 8.11." // TODO check message
          />
        }
        color="subdued"
      />
    );
  }

  return null;
};
