/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { Node, NodeProps } from '@xyflow/react';
import { EuiBadge, EuiIcon, useEuiTheme } from '@elastic/eui';
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

const badgesContainerStyles = (euiTheme: { size: { xs: string }; levels: { header: number } }) =>
  css`
    position: absolute;
    top: -${euiTheme.size.xs};
    left: 50%;
    transform: translateX(-50%);
    z-index: ${euiTheme.levels.header};
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
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
    const theme = {
      size: euiTheme.size,
      levels: { header: Number(euiTheme.levels?.header ?? 2000) },
    };

    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <ServiceNode {...(props as unknown as React.ComponentProps<typeof ServiceNode>)} />
        {showBadges && (
          <div css={badgesContainerStyles(theme)}>
            {showAlert && (
              <EuiBadge
                color="danger"
                data-test-subj="serviceNodeAlertBadge"
                title={`${alertCount} alert${alertCount === 1 ? '' : 's'}`}
              >
                <EuiIcon type="warning" size="s" aria-hidden />
                {alertCount}
              </EuiBadge>
            )}
            {showSlo && (
              <EuiBadge
                color="warning"
                data-test-subj="serviceNodeSloBadge"
                title={`${sloCount} SLO${sloCount === 1 ? '' : 's'}`}
              >
                <EuiIcon type="visGauge" size="s" aria-hidden />
                {sloCount}
              </EuiBadge>
            )}
          </div>
        )}
      </div>
    );
  }
);

ServiceNodeWithAlertAndSloBadges.displayName = 'ServiceNodeWithAlertAndSloBadges';
