/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonGroup } from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React from 'react';
import {
  InfraSnapshotMetricInput,
  InfraSnapshotMetricType,
  InfraNodeType,
  InfraSnapshotGroupbyInput,
} from '../../graphql/types';

interface Props {
  intl: InjectedIntl;
  nodeType: InfraNodeType;
  changeNodeType: (nodeType: InfraNodeType) => void;
  changeGroupBy: (groupBy: InfraSnapshotGroupbyInput[]) => void;
  changeMetric: (metric: InfraSnapshotMetricInput) => void;
}

export class WaffleNodeTypeSwitcherClass extends React.PureComponent<Props> {
  public render() {
    const { intl } = this.props;

    const nodeOptions = [
      {
        id: InfraNodeType.host,
        label: intl.formatMessage({
          id: 'xpack.infra.waffle.nodeTypeSwitcher.hostsLabel',
          defaultMessage: 'Hosts',
        }),
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

    return (
      <EuiButtonGroup
        legend="Node type selection"
        color="primary"
        options={nodeOptions}
        idSelected={this.props.nodeType}
        onChange={this.handleClick}
        buttonSize="m"
      />
    );
  }

  private handleClick = (nodeType: string) => {
    this.props.changeNodeType(nodeType as InfraNodeType);
    this.props.changeGroupBy([]);
    this.props.changeMetric({ type: InfraSnapshotMetricType.cpu });
  };
}

export const WaffleNodeTypeSwitcher = injectI18n(WaffleNodeTypeSwitcherClass);
