/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiKeyPadMenu, EuiKeyPadMenuItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
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

export class WaffleNodeTypeSwitcher extends React.PureComponent<Props> {
  public render() {
    return (
      <EuiKeyPadMenu>
        <EuiKeyPadMenuItem
          label={
            <FormattedMessage
              id="xpack.infra.waffle.nodeTypeSwitcher.hostsLabel"
              defaultMessage="Hosts"
            />
          }
          onClick={this.handleClick(InfraNodeType.host)}
        >
          <img
            src="../plugins/infra/images/hosts.svg"
            role="presentation"
            alt=""
            className="euiIcon euiIcon--large"
          />
        </EuiKeyPadMenuItem>
        <EuiKeyPadMenuItem label="Kubernetes" onClick={this.handleClick(InfraNodeType.pod)}>
          <img
            src="../plugins/infra/images/k8.svg"
            role="presentation"
            alt=""
            className="euiIcon euiIcon--large"
          />
        </EuiKeyPadMenuItem>
        <EuiKeyPadMenuItem label="Docker" onClick={this.handleClick(InfraNodeType.container)}>
          <img
            src="../plugins/infra/images/docker.svg"
            role="presentation"
            alt=""
            className="euiIcon euiIcon--large"
          />
        </EuiKeyPadMenuItem>
      </EuiKeyPadMenu>
    );
  }

  private handleClick = (nodeType: InfraNodeType) => () => {
    this.props.changeNodeType(nodeType);
    this.props.changeGroupBy([]);
    this.props.changeMetric({ type: InfraMetricType.cpu });
  };
}
