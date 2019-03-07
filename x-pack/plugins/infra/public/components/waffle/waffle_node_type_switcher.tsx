/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonGroup, EuiKeyPadMenu, EuiKeyPadMenuItemButton } from '@elastic/eui';
import React from 'react';
import {
  InfraMetricInput,
  InfraMetricType,
  InfraNodeType,
  InfraPathInput,
} from '../../graphql/types';

interface Props {
  nodeType: InfraNodeType;
  changeNodeType: (nodeType: InfraNodeType) => void;
  changeGroupBy: (groupBy: InfraPathInput[]) => void;
  changeMetric: (metric: InfraMetricInput) => void;
}

const nodeOptions = [
  {
    id: InfraNodeType.host,
    label: 'Hosts',
  },
  {
    id: InfraNodeType.pod,
    label: 'Kubernetes',
  },
  {
    id: InfraNodeType.container,
    label: 'Docker',
  },
];

export class WaffleNodeTypeSwitcher extends React.PureComponent<Props> {
  public render() {
    return (
      <EuiButtonGroup
        legend="Node type selection"
        color="primary"
        options={nodeOptions}
        idSelected={this.props.nodeType}
        onChange={this.handleClick}
      />
    );
  }

  private handleClick = (nodeType: InfraNodeType) => {
    this.props.changeNodeType(nodeType);
    this.props.changeGroupBy([]);
    this.props.changeMetric({ type: InfraMetricType.cpu });
  };
}
