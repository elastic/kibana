/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { first } from 'lodash';
import React from 'react';
import type { EuiTheme } from '../../../../../../../../../src/plugins/kibana_react/common/eui_styled_components';
import { withTheme } from '../../../../../../../../../src/plugins/kibana_react/common/eui_styled_components';
import { getCustomMetricLabel } from '../../../../../../common/formatters/get_custom_metric_label';
import type { SnapshotCustomMetricInput } from '../../../../../../common/http_api/snapshot_api';
import { findInventoryModel } from '../../../../../../common/inventory_models';
import { SNAPSHOT_METRIC_TRANSLATIONS } from '../../../../../../common/inventory_models/intl_strings';
import type {
  InventoryItemType,
  SnapshotMetricType,
} from '../../../../../../common/inventory_models/types';
import { SnapshotMetricTypeRT } from '../../../../../../common/inventory_models/types';
import { useSourceContext } from '../../../../../containers/metrics_source/source';
import type { InfraWaffleMapNode } from '../../../../../lib/lib';
import { createFormatterForMetric } from '../../../metrics_explorer/components/helpers/create_formatter_for_metric';
import { useSnapshot } from '../../hooks/use_snaphot';
import { useWaffleOptionsContext } from '../../hooks/use_waffle_options';
import { createInventoryMetricFormatter } from '../../lib/create_inventory_metric_formatter';

export interface Props {
  currentTime: number;
  node: InfraWaffleMapNode;
  nodeType: InventoryItemType;
  theme: EuiTheme | undefined;
}
export const ConditionalToolTip = withTheme(({ theme, node, nodeType, currentTime }: Props) => {
  const { sourceId } = useSourceContext();
  const model = findInventoryModel(nodeType);
  const { customMetrics } = useWaffleOptionsContext();
  const requestMetrics = model.tooltipMetrics
    .map((type) => ({ type }))
    .concat(customMetrics) as Array<
    | {
        type: SnapshotMetricType;
      }
    | SnapshotCustomMetricInput
  >;
  const query = JSON.stringify({
    bool: {
      filter: {
        match_phrase: { [model.fields.id]: node.id },
      },
    },
  });
  const { nodes } = useSnapshot(query, requestMetrics, [], nodeType, sourceId, currentTime, '', '');

  const dataNode = first(nodes);
  const metrics = (dataNode && dataNode.metrics) || [];
  return (
    <div style={{ minWidth: 200 }} data-test-subj={`conditionalTooltipContent-${node.name}`}>
      <div
        style={{
          borderBottom: `1px solid ${theme?.eui.euiColorMediumShade}`,
          paddingBottom: theme?.eui.paddingSizes.xs,
          marginBottom: theme?.eui.paddingSizes.xs,
        }}
      >
        {node.name}
      </div>
      {metrics.map((metric) => {
        const metricName = SnapshotMetricTypeRT.is(metric.name) ? metric.name : 'custom';
        const name = SNAPSHOT_METRIC_TRANSLATIONS[metricName] || metricName;
        // if custom metric, find field and label from waffleOptionsContext result
        // because useSnapshot does not return it
        const customMetric =
          name === 'custom' ? customMetrics.find((item) => item.id === metric.name) : null;
        const formatter = customMetric
          ? createFormatterForMetric(customMetric)
          : createInventoryMetricFormatter({ type: metricName });
        return (
          <EuiFlexGroup gutterSize="s" key={metric.name}>
            <EuiFlexItem
              grow={1}
              className="eui-textTruncate eui-displayBlock"
              data-test-subj="conditionalTooltipContent-metric"
            >
              {customMetric ? getCustomMetricLabel(customMetric) : name}
            </EuiFlexItem>
            <EuiFlexItem grow={false} data-test-subj="conditionalTooltipContent-value">
              {(metric.value && formatter(metric.value)) || '-'}
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      })}
    </div>
  );
});
