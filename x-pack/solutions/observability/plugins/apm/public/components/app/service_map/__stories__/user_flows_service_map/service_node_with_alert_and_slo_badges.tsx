/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import type { Node, NodeProps } from '@xyflow/react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ServiceNodeData } from '../../../../../../common/service_map';
import { ServiceNode } from '../../service_node';

/** Demo-only: ServiceNodeData with optional alert and SLO counts for badges */
export interface ServiceNodeWithAlertAndSloData extends ServiceNodeData {
  alertCount?: number;
  sloCount?: number;
  /** When false, hide the alerts badge (e.g. from story filter). Default true. */
  showAlertsBadge?: boolean;
  /** When false, hide the SLO badge (e.g. from story filter). Default true. */
  showSloBadge?: boolean;
}

type ServiceNodeWithAlertAndSloType = Node<
  ServiceNodeWithAlertAndSloData,
  'serviceWithAlertAndSlo'
>;

const badgesContainerStyles = (
  euiTheme: { size: { xs: string; s: string }; levels: { header: number } },
  twoBadges: boolean
) => css`
  position: absolute;
  top: ${twoBadges ? `calc(-${euiTheme.size.m} - ${euiTheme.size.m})` : `-${euiTheme.size.xs}`};
  right: -${euiTheme.size.xs};
  z-index: ${euiTheme.levels.header};
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: ${euiTheme.size.xs};
`;

export const ServiceNodeWithAlertAndSloBadges = memo(
  (props: NodeProps<ServiceNodeWithAlertAndSloType>) => {
    const { data } = props;
    const { euiTheme } = useEuiTheme();
    const alertCount = data.alertCount ?? 0;
    const sloCount = data.sloCount ?? 0;
    const showAlertsBadge = data.showAlertsBadge !== false;
    const showSloBadge = data.showSloBadge !== false;
    const showAlert = showAlertsBadge && alertCount > 0;
    const showSlo = showSloBadge && sloCount > 0;
    const showBadges = showAlert || showSlo;
    const twoBadges = showAlert && showSlo;

    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <ServiceNode {...props} />
        {showBadges && (
          <div css={badgesContainerStyles(euiTheme, twoBadges)}>
            {showSlo && (
              <EuiBadge color="warning" data-test-subj="serviceNodeSloBadge">
                <EuiFlexGroup alignItems="center" gutterSize="xs">
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="visGauge" aria-hidden />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    {sloCount}{' '}
                    {i18n.translate('xpack.apm.serviceNodeWithAlertAndSloBadges.sloBadgeLabel', {
                      defaultMessage: 'SLOs',
                    })}
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiBadge>
            )}
            {showAlert && (
              <EuiBadge color="danger" data-test-subj="serviceNodeAlertBadge">
                {alertCount}{' '}
                {i18n.translate('xpack.apm.serviceNodeWithAlertAndSloBadges.alertsBadgeLabel', {
                  defaultMessage: 'alerts',
                })}
              </EuiBadge>
            )}
          </div>
        )}
      </div>
    );
  }
);

ServiceNodeWithAlertAndSloBadges.displayName = 'ServiceNodeWithAlertAndSloBadges';
