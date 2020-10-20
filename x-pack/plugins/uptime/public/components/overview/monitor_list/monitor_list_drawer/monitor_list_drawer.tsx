/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiLink, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import { MostRecentError } from './most_recent_error';
import { MonitorStatusList } from './monitor_status_list';
import { MonitorDetails, MonitorSummary } from '../../../../../common/runtime_types';
import { ActionsPopover } from './actions_popover/actions_popover_container';
import { EnabledAlerts } from './enabled_alerts';
import { Alert } from '../../../../../../triggers_actions_ui/public';

const ContainerDiv = styled.div`
  padding: 10px;
  width: 100%;
`;

interface MonitorListDrawerProps {
  /**
   * Monitor Summary
   */
  summary: MonitorSummary;

  /**
   * Monitor details to be fetched from rest api using monitorId
   */
  monitorDetails: MonitorDetails;
  loading: boolean;
}

/**
 * The elements shown when the user expands the monitor list rows.
 */

export function MonitorListDrawerComponent({
  summary,
  monitorDetails,
  loading,
}: MonitorListDrawerProps) {
  const monitorUrl = summary?.state?.url?.full || '';

  return summary && summary.state.summaryPings ? (
    <ContainerDiv>
      <EuiFlexGroup>
        <EuiFlexItem grow={true}>
          <EuiText>
            <EuiLink href={monitorUrl} target="_blank">
              {monitorUrl}
              <EuiIcon size="s" type="popout" color="subbdued" />
            </EuiLink>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ActionsPopover summary={summary} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <MonitorStatusList summaryPings={summary.state.summaryPings} />
      <EnabledAlerts loading={loading} monitorAlerts={monitorDetails?.alerts as Alert[]} />
      {monitorDetails && monitorDetails.error && (
        <MostRecentError
          error={monitorDetails.error}
          monitorId={summary.monitor_id}
          timestamp={monitorDetails.timestamp}
        />
      )}
    </ContainerDiv>
  ) : null;
}
