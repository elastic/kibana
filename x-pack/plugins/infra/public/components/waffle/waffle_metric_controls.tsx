/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiComboBox } from '@elastic/eui';
import { get, last } from 'lodash';
import React from 'react';
import {
  InfraMetricInput,
  InfraMetricType,
  InfraPathInput,
  InfraPathType,
} from '../../../common/graphql/types';
interface Props {
  path: InfraPathInput[];
  metrics: InfraMetricInput[];
  onChange: (metrics: InfraMetricInput[]) => void;
}

const OPTIONS = {
  [InfraPathType.pods]: [
    { label: 'CPU Usage', metric: { type: InfraMetricType.cpu } },
    { label: 'Memory Usage', metric: { type: InfraMetricType.memory } },
    { label: 'Inbound Traffic', metric: { type: InfraMetricType.rx } },
    { label: 'Outbound Traffic', metric: { type: InfraMetricType.tx } },
  ],
  [InfraPathType.containers]: [
    { label: 'CPU Usage', metric: { type: InfraMetricType.cpu } },
    { label: 'Memory Usage', metric: { type: InfraMetricType.memory } },
    { label: 'Inbound Traffic', metric: { type: InfraMetricType.rx } },
    { label: 'Outbound Traffic', metric: { type: InfraMetricType.tx } },
  ],
  [InfraPathType.hosts]: [
    { label: 'CPU Usage', metric: { type: InfraMetricType.cpu } },
    { label: 'Memory Usage', metric: { type: InfraMetricType.memory } },
    { label: 'Inbound Traffic', metric: { type: InfraMetricType.rx } },
    { label: 'Outbound Traffic', metric: { type: InfraMetricType.tx } },
  ],
};

interface OptionsItem {
  label: string;
  metric: InfraMetricInput;
}

export class WaffleMetricControls extends React.PureComponent<Props> {
  public render() {
    const nodePart = last(this.props.path);
    const currentMetric = last(this.props.metrics);
    const options = get(OPTIONS, nodePart.type, [] as OptionsItem[]);
    const selectedOptions = options.filter(o => o.metric.type === currentMetric.type);
    if (!options.length || !selectedOptions) {
      return null;
    }
    return (
      <EuiComboBox
        options={options}
        selectedOptions={selectedOptions}
        onChange={this.handleChange}
        isClearable={false}
        singleSelection={true}
      />
    );
  }
  private handleChange = (value: OptionsItem[]) => {
    this.props.onChange(value.map(v => v.metric));
  };
}
