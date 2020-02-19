/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { EuiFlexItem } from '@elastic/eui';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ToolbarProps } from '../../../../public/components/inventory/toolbars/toolbar';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { WaffleMetricControls } from '../../../../public/components/waffle/waffle_metric_controls';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { WaffleGroupByControls } from '../../../../public/components/waffle/waffle_group_by_controls';
import {
  toGroupByOpt,
  toMetricOpt,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../../public/components/inventory/toolbars/toolbar_wrapper';
import { SnapshotMetricType } from '../../types';

interface Props extends ToolbarProps {
  metricTypes: SnapshotMetricType[];
  groupByFields: string[];
}

export const MetricsAndGroupByToolbarItems = (props: Props) => {
  const metricOptions = useMemo(() => props.metricTypes.map(toMetricOpt), [props.metricTypes]);

  const groupByOptions = useMemo(() => props.groupByFields.map(toGroupByOpt), [
    props.groupByFields,
  ]);

  return (
    <>
      <EuiFlexItem grow={false}>
        <WaffleMetricControls
          options={metricOptions}
          metric={props.metric}
          onChange={props.changeMetric}
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
    </>
  );
};
