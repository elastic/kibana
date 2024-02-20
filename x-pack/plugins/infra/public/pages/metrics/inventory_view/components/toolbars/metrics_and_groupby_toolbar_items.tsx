/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem } from '@elastic/eui';
import React, { useMemo } from 'react';
import { SnapshotMetricType } from '@kbn/metrics-data-access-plugin/common';
import { toMetricOpt } from '../../../../../../common/snapshot_metric_i18n';
import { WaffleMetricControls } from '../waffle/metric_control';
import { WaffleGroupByControls } from '../waffle/waffle_group_by_controls';
import { WaffleSortControls } from '../waffle/waffle_sort_controls';
import { toGroupByOpt } from './toolbar_wrapper';
import type { ToolbarProps } from './types';

interface Props extends ToolbarProps {
  metricTypes: SnapshotMetricType[];
  groupByFields: string[];
}

export const MetricsAndGroupByToolbarItems = ({
  inventoryPageCallbacks,
  inventoryPageState,
  ...props
}: Props) => {
  const { context } = inventoryPageState;
  const metricOptions = useMemo(
    () =>
      props.metricTypes.map(toMetricOpt).filter((v) => v) as Array<{ text: string; value: string }>,
    [props.metricTypes]
  );

  const groupByOptions = useMemo(
    () => props.groupByFields.map(toGroupByOpt),
    [props.groupByFields]
  );

  return (
    <>
      <EuiFlexItem grow={false}>
        <WaffleMetricControls
          fields={props.createDerivedIndexPattern().fields}
          options={metricOptions}
          metric={context.options.metric}
          onChange={(metric) => inventoryPageCallbacks.updateOptions({ metric })}
          onChangeCustomMetrics={(customMetrics) =>
            inventoryPageCallbacks.updateOptions({ customMetrics })
          }
          customMetrics={context.options.customMetrics}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <WaffleGroupByControls
          options={groupByOptions}
          groupBy={context.options.groupBy}
          nodeType={context.options.nodeType}
          onChange={(groupBy) => inventoryPageCallbacks.updateOptions({ groupBy })}
          fields={props.createDerivedIndexPattern().fields}
          onChangeCustomOptions={(customOptions) =>
            inventoryPageCallbacks.updateOptions({ customOptions })
          }
          customOptions={context.options.customOptions}
        />
      </EuiFlexItem>
      {context.options.view === 'map' && (
        <EuiFlexItem grow={false}>
          <WaffleSortControls
            sort={context.options.sort}
            onChange={(sort) => inventoryPageCallbacks.updateOptions({ sort })}
          />
        </EuiFlexItem>
      )}
    </>
  );
};
