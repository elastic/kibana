/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { EuiFlexItem } from '@elastic/eui';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { WaffleSortControls } from '../../../../public/pages/metrics/inventory_view/components/waffle/waffle_sort_controls';
import { ToolbarProps } from '../../../../public/pages/metrics/inventory_view/components/toolbars/toolbar';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { WaffleMetricControls } from '../../../../public/pages/metrics/inventory_view/components/waffle/metric_control';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { WaffleGroupByControls } from '../../../../public/pages/metrics/inventory_view/components/waffle/waffle_group_by_controls';
import {
  toGroupByOpt,
  toMetricOpt,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../public/pages/metrics/inventory_view/components/toolbars/toolbar_wrapper';
import { SnapshotMetricType } from '../../types';

interface Props extends ToolbarProps {
  metricTypes: SnapshotMetricType[];
  groupByFields: string[];
}

export const MetricsAndGroupByToolbarItems = (props: Props) => {
  const metricOptions = useMemo(
    () =>
      props.metricTypes.map(toMetricOpt).filter((v) => v) as Array<{ text: string; value: string }>,
    [props.metricTypes]
  );

  const groupByOptions = useMemo(() => props.groupByFields.map(toGroupByOpt), [
    props.groupByFields,
  ]);

  return (
    <>
      <EuiFlexItem grow={false}>
        <WaffleMetricControls
          fields={props.createDerivedIndexPattern('metrics').fields}
          options={metricOptions}
          metric={props.metric}
          onChange={props.changeMetric}
          onChangeCustomMetrics={props.changeCustomMetrics}
          customMetrics={props.customMetrics}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <WaffleGroupByControls
          options={groupByOptions}
          groupBy={props.groupBy}
          nodeType={props.nodeType}
          onChange={props.changeGroupBy}
          fields={props.createDerivedIndexPattern('metrics').fields}
          onChangeCustomOptions={props.changeCustomOptions}
          customOptions={props.customOptions}
        />
      </EuiFlexItem>
      {props.view === 'map' && (
        <EuiFlexItem grow={false}>
          <WaffleSortControls sort={props.sort} onChange={props.changeSort} />
        </EuiFlexItem>
      )}
    </>
  );
};
