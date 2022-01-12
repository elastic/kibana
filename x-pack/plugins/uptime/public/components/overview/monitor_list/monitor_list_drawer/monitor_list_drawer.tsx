/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { Rule } from '../../../../../../triggers_actions_ui/public';
import { MostRecentError } from './most_recent_error';
import { MonitorStatusList } from './monitor_status_list';
import { MonitorDetails, MonitorSummary } from '../../../../../common/runtime_types';
import { ActionsPopover } from './actions_popover/actions_popover_container';
import { EnabledAlerts } from './enabled_alerts';
import { MonitorUrl } from './monitor_url';
import { MostRecentRun } from './most_recent_run';

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
          <EuiFlexGroup style={{ maxWidth: 1000 }}>
            <EuiFlexItem>
              <MonitorUrl monitorUrl={monitorUrl} />
            </EuiFlexItem>
            <EuiFlexItem>
              <MostRecentRun summary={summary} />
              {/* TODO: add link to details page */}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ActionsPopover summary={summary} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <MonitorStatusList summaryPings={summary.state.summaryPings} />
      <EuiSpacer size="s" />
      <EnabledAlerts loading={loading} monitorAlerts={monitorDetails?.alerts as Rule[]} />
      <EuiSpacer size="s" />
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
