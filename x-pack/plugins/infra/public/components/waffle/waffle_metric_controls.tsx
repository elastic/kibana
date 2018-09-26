/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSelect } from '@elastic/eui';
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
    { text: 'CPU Usage', value: InfraMetricType.cpu },
    { text: 'Memory Usage', value: InfraMetricType.memory },
    { text: 'Inbound Traffic', value: InfraMetricType.rx },
    { text: 'Outbound Traffic', value: InfraMetricType.tx },
  ],
  [InfraPathType.containers]: [
    { text: 'CPU Usage', value: InfraMetricType.cpu },
    { text: 'Memory Usage', value: InfraMetricType.memory },
    { text: 'Inbound Traffic', value: InfraMetricType.rx },
    { text: 'Outbound Traffic', value: InfraMetricType.tx },
  ],
  [InfraPathType.hosts]: [
    { text: 'CPU Usage', value: InfraMetricType.cpu },
    { text: 'Memory Usage', value: InfraMetricType.memory },
    { text: 'Inbound Traffic', value: InfraMetricType.rx },
    { text: 'Outbound Traffic', value: InfraMetricType.tx },
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
    const value = currentMetric.type;
    if (!options.length || !value) {
      throw Error('Unable to select options or value for metric.');
    }
    return <EuiSelect options={options} value={value} onChange={this.handleChange} />;
  }
  private handleChange = (e: { target: { value: InfraMetricType } }) => {
    this.props.onChange([{ type: e.target.value }]);
  };
}
