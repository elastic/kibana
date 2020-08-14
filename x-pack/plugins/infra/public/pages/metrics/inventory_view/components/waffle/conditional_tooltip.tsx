/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useState, useEffect } from 'react';
import { EuiToolTip, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { first } from 'lodash';
import { withTheme, EuiTheme } from '../../../../../../../observability/public';
import { useSourceContext } from '../../../../../containers/source';
import { findInventoryModel } from '../../../../../../common/inventory_models';
import {
  InventoryItemType,
  SnapshotMetricType,
} from '../../../../../../common/inventory_models/types';
import { InfraWaffleMapNode, InfraWaffleMapOptions } from '../../../../../lib/lib';
import { useSnapshot } from '../../hooks/use_snaphot';
import { createInventoryMetricFormatter } from '../../lib/create_inventory_metric_formatter';
import { SNAPSHOT_METRIC_TRANSLATIONS } from '../../../../../../common/inventory_models/intl_strings';

export interface Props {
  currentTime: number;
  hidden: boolean;
  node: InfraWaffleMapNode;
  options: InfraWaffleMapOptions;
  formatter: (val: number) => string;
  children: React.ReactElement;
  nodeType: InventoryItemType;
  theme: EuiTheme | undefined;
}

export const ConditionalToolTip = withTheme(
  ({ theme, hidden, node, children, nodeType, currentTime }: Props) => {
    const { sourceId } = useSourceContext();
    const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
    const model = findInventoryModel(nodeType);
    const requestMetrics = model.tooltipMetrics.map((type) => ({ type })) as Array<{
      type: SnapshotMetricType;
    }>;
    const query = JSON.stringify({
      bool: {
        filter: {
          match_phrase: { [model.fields.id]: node.id },
        },
      },
    });

    const { nodes, reload } = useSnapshot(
      query,
      requestMetrics,
      [],
      nodeType,
      sourceId,
      currentTime,
      '',
      '',
      false // Doesn't send request until reload() is called
    );

    const handleDataLoad = useCallback(() => {
      const id = setTimeout(reload, 200);
      setTimer(id);
    }, [reload]);

    const cancelDataLoad = useCallback(() => {
      return (timer && clearTimeout(timer)) || void 0;
    }, [timer]);

    useEffect(() => {
      return cancelDataLoad;
    }, [timer, cancelDataLoad]);

    if (hidden) {
      return children;
    }

    const dataNode = first(nodes);
    const metrics = (dataNode && dataNode.metrics) || [];
    const content = (
      <div style={{ minWidth: 200 }} data-test-subj="conditionalTooltipContent">
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
          const name = SNAPSHOT_METRIC_TRANSLATIONS[metric.name] || metric.name;
          const formatter = createInventoryMetricFormatter({ type: metric.name });
          return (
            <EuiFlexGroup gutterSize="none" key={metric.name}>
              <EuiFlexItem grow={1}>{name}</EuiFlexItem>
              <EuiFlexItem grow={false}>
                {(metric.value && formatter(metric.value)) || '-'}
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        })}
      </div>
    );

    return (
      <EuiToolTip delay="regular" position="right" content={content}>
        <div
          data-test-subj="conditionalTooltipMouseHandler"
          onMouseOver={handleDataLoad}
          onFocus={handleDataLoad}
          onMouseOut={cancelDataLoad}
          onBlur={cancelDataLoad}
        >
          {children}
        </div>
      </EuiToolTip>
    );
  }
);
