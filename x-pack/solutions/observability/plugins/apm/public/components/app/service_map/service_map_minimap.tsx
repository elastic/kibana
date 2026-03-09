/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { MiniMap } from '@xyflow/react';
import { useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { ServiceMapNode } from '../../../../common/service_map';
import { isServiceNodeData } from '../../../../common/service_map';
import { getServiceHealthStatusColor } from '../../../../common/service_health_status';

export function ServiceMapMinimap() {
  const { euiTheme } = useEuiTheme();

  const nodeColor = useCallback(
    (node: ServiceMapNode) => {
      if (isServiceNodeData(node.data)) {
        const { healthStatus } = node.data.serviceAnomalyStats ?? {};
        if (healthStatus) {
          return getServiceHealthStatusColor(euiTheme, healthStatus);
        }
        return euiTheme.colors.primary;
      }
      return euiTheme.colors.mediumShade;
    },
    [euiTheme]
  );

  const styles = useMemo(
    () => css`
      background-color: ${euiTheme.colors.backgroundBasePlain};
      border-radius: ${euiTheme.border.radius.medium};
      border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.lightShade};
    `,
    [euiTheme]
  );

  return (
    <MiniMap
      nodeColor={nodeColor}
      nodeStrokeWidth={0}
      nodeBorderRadius={2}
      maskColor={`${euiTheme.colors.lightShade}80`}
      bgColor={euiTheme.colors.backgroundBasePlain}
      position="bottom-right"
      pannable
      zoomable
      ariaLabel={i18n.translate('xpack.apm.serviceMap.minimap.ariaLabel', {
        defaultMessage: 'Service map minimap. Use to navigate and zoom the map.',
      })}
      css={styles}
      data-test-subj="serviceMapMinimap"
    />
  );
}
