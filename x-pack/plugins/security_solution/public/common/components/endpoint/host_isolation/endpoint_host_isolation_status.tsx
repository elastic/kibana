/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiTextColor, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { useTestIdGenerator } from '../../../../management/components/hooks/use_test_id_generator';
import { useIsExperimentalFeatureEnabled } from '../../../hooks/use_experimental_features';

export interface EndpointHostIsolationStatusProps {
  isIsolated: boolean;
  /** the count of pending isolate actions */
  pendingIsolate?: number;
  /** the count of pending unisolate actions */
  pendingUnIsolate?: number;
  'data-test-subj'?: string;
}

/**
 * Component will display a host isolation status based on whether it is currently isolated or there are
 * isolate/unisolate actions pending. If none of these are applicable, no UI component will be rendered
 * (`null` is returned)
 */
export const EndpointHostIsolationStatus = memo<EndpointHostIsolationStatusProps>(
  ({ isIsolated, pendingIsolate = 0, pendingUnIsolate = 0, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const isPendingStatuseDisabled = useIsExperimentalFeatureEnabled(
      'disableIsolationUIPendingStatuses'
    );

    return useMemo(() => {
      if (isPendingStatuseDisabled) {
        // If nothing is pending and host is not currently isolated, then render nothing
        if (!isIsolated) {
          return null;
        }

        return (
          <EuiBadge color="hollow" data-test-subj={dataTestSubj}>
            <FormattedMessage
              id="xpack.securitySolution.endpoint.hostIsolationStatus.isolated"
              defaultMessage="Isolated"
            />
          </EuiBadge>
        );
      }

      // If nothing is pending and host is not currently isolated, then render nothing
      if (!isIsolated && !pendingIsolate && !pendingUnIsolate) {
        return null;
      }

      // If nothing is pending, but host is isolated, then show isolation badge
      if (!pendingIsolate && !pendingUnIsolate) {
        return (
          <EuiBadge color="hollow" data-test-subj={dataTestSubj}>
            <FormattedMessage
              id="xpack.securitySolution.endpoint.hostIsolationStatus.isolated"
              defaultMessage="Isolated"
            />
          </EuiBadge>
        );
      }

      // If there are multiple types of pending isolation actions, then show count of actions with tooltip that displays breakdown
      if (pendingIsolate && pendingUnIsolate) {
        return (
          <EuiBadge color="hollow" data-test-subj={dataTestSubj}>
            <EuiToolTip
              display="block"
              anchorClassName="eui-textTruncate"
              content={
                <div data-test-subj={getTestId('tooltipContent')}>
                  <div>
                    <FormattedMessage
                      id="xpack.securitySolution.endpoint.hostIsolationStatus.tooltipPendingActions"
                      defaultMessage="Pending actions:"
                    />
                  </div>
                  <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween">
                    <EuiFlexItem grow>
                      <FormattedMessage
                        id="xpack.securitySolution.endpoint.hostIsolationStatus.tooltipPendingIsolate"
                        defaultMessage="Isolate"
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>{pendingIsolate}</EuiFlexItem>
                  </EuiFlexGroup>
                  <EuiFlexGroup gutterSize="none">
                    <EuiFlexItem grow>
                      <FormattedMessage
                        id="xpack.securitySolution.endpoint.hostIsolationStatus.tooltipPendingUnIsolate"
                        defaultMessage="Release"
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>{pendingUnIsolate}</EuiFlexItem>
                  </EuiFlexGroup>
                </div>
              }
            >
              <EuiTextColor color="subdued" data-test-subj={getTestId('pending')}>
                <FormattedMessage
                  id="xpack.securitySolution.endpoint.hostIsolationStatus.multiplePendingActions"
                  defaultMessage="{count} actions pending"
                  values={{ count: pendingIsolate + pendingUnIsolate }}
                />
              </EuiTextColor>
            </EuiToolTip>
          </EuiBadge>
        );
      }

      // Show 'pending [un]isolate' depending on what's pending
      return (
        <EuiBadge color="hollow" data-test-subj={dataTestSubj}>
          <EuiTextColor color="subdued" data-test-subj={getTestId('pending')}>
            {pendingIsolate ? (
              <FormattedMessage
                id="xpack.securitySolution.endpoint.hostIsolationStatus.isIsolating"
                defaultMessage="Isolating"
              />
            ) : (
              <FormattedMessage
                id="xpack.securitySolution.endpoint.hostIsolationStatus.isUnIsolating"
                defaultMessage="Releasing"
              />
            )}
          </EuiTextColor>
        </EuiBadge>
      );
    }, [
      dataTestSubj,
      getTestId,
      isIsolated,
      isPendingStatuseDisabled,
      pendingIsolate,
      pendingUnIsolate,
    ]);
  }
);

EndpointHostIsolationStatus.displayName = 'EndpointHostIsolationStatus';
