/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiTextColor, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EndpointHostIsolationStatusProps } from './host_isolation';

export const AgentPendingActionStatusBadge = memo<
  { 'data-test-subj'?: string } & Pick<EndpointHostIsolationStatusProps, 'pendingActions'>
>(({ 'data-test-subj': dataTestSubj, pendingActions }) => {
  return (
    <EuiBadge color="hollow" data-test-subj={dataTestSubj}>
      <EuiToolTip
        display="block"
        anchorClassName="eui-textTruncate"
        content={
          <div style={{ width: 150 }} data-test-subj={`${dataTestSubj}-tooltipContent`}>
            <div>
              <FormattedMessage
                id="xpack.securitySolution.endpoint.hostIsolationStatus.tooltipPendingActions"
                defaultMessage="Pending actions:"
              />
            </div>
            {!!pendingActions.pendingIsolate && (
              <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween">
                <EuiFlexItem>
                  <FormattedMessage
                    id="xpack.securitySolution.endpoint.hostIsolationStatus.tooltipPendingIsolate"
                    defaultMessage="Isolate"
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>{pendingActions.pendingIsolate}</EuiFlexItem>
              </EuiFlexGroup>
            )}
            {!!pendingActions.pendingUnIsolate && (
              <EuiFlexGroup gutterSize="none">
                <EuiFlexItem>
                  <FormattedMessage
                    id="xpack.securitySolution.endpoint.hostIsolationStatus.tooltipPendingUnIsolate"
                    defaultMessage="Release"
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>{pendingActions.pendingUnIsolate}</EuiFlexItem>
              </EuiFlexGroup>
            )}
            {!!pendingActions.pendingKillProcess && (
              <EuiFlexGroup gutterSize="none">
                <EuiFlexItem>
                  <FormattedMessage
                    id="xpack.securitySolution.endpoint.hostIsolationStatus.tooltipPendingKillProcess"
                    defaultMessage="Kill process"
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>{pendingActions.pendingKillProcess}</EuiFlexItem>
              </EuiFlexGroup>
            )}
            {!!pendingActions.pendingSuspendProcess && (
              <EuiFlexGroup gutterSize="none">
                <EuiFlexItem>
                  <FormattedMessage
                    id="xpack.securitySolution.endpoint.hostIsolationStatus.tooltipPendingSuspendProcess"
                    defaultMessage="Suspend process"
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>{pendingActions.pendingSuspendProcess}</EuiFlexItem>
              </EuiFlexGroup>
            )}
            {!!pendingActions.pendingRunningProcesses && (
              <EuiFlexGroup gutterSize="none">
                <EuiFlexItem>
                  <FormattedMessage
                    id="xpack.securitySolution.endpoint.hostIsolationStatus.tooltipPendingRunningProcesses"
                    defaultMessage="Processes"
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>{pendingActions.pendingRunningProcesses}</EuiFlexItem>
              </EuiFlexGroup>
            )}
          </div>
        }
      >
        <EuiTextColor color="subdued" data-test-subj={`${dataTestSubj}-pending`}>
          <FormattedMessage
            id="xpack.securitySolution.endpoint.hostIsolationStatus.multiplePendingActions"
            defaultMessage="{count} {count, plural, one {action} other {actions}} pending"
            values={{
              count: Object.values(pendingActions).reduce((prev, curr) => prev + curr, 0),
            }}
          />
        </EuiTextColor>
      </EuiToolTip>
    </EuiBadge>
  );
});

AgentPendingActionStatusBadge.displayName = 'AgentPendingActionStatusBadge';
