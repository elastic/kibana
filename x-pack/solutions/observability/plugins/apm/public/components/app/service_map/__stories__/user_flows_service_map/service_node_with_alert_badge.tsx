/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import type { Node, NodeProps } from '@xyflow/react';
import { EuiBadge, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ServiceNodeData } from '../../../../../../common/service_map';
import { ServiceNode } from '../../service_node';

/** Demo-only: ServiceNodeData with optional alert count for badge */
export interface ServiceNodeWithAlertData extends ServiceNodeData {
  alertCount?: number;
}

type ServiceNodeWithAlertType = Node<ServiceNodeWithAlertData, 'serviceWithAlert'>;

export const ServiceNodeWithAlertBadge = memo((props: NodeProps<ServiceNodeWithAlertType>) => {
  const { data } = props;
  const { euiTheme } = useEuiTheme();
  const alertCount = data.alertCount ?? 0;

  const badgeStyles = css`
    position: absolute;
    top: -${euiTheme.size.xs};
    right: -${euiTheme.size.xs};
    z-index: ${euiTheme.levels.header};
  `;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <ServiceNode {...props} />
      {alertCount > 0 && (
        <EuiBadge color="danger" css={badgeStyles} data-test-subj="serviceNodeAlertBadge">
          {alertCount}{' '}
          {i18n.translate('xpack.apm.serviceNodeWithAlertBadge.alertsBadgeLabel', {
            defaultMessage: 'alerts',
          })}
        </EuiBadge>
      )}
    </div>
  );
});

ServiceNodeWithAlertBadge.displayName = 'ServiceNodeWithAlertBadge';
