/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiFilterButton,
  EuiFilterGroup,
  EuiPopover,
} from '@elastic/eui';
import React from 'react';
import { InfraMetricInput, InfraMetricType, InfraNodeType } from '../../../common/graphql/types';
interface Props {
  nodeType: InfraNodeType;
  metric: InfraMetricInput;
  onChange: (metric: InfraMetricInput) => void;
}

const OPTIONS = {
  [InfraNodeType.pod]: [
    { text: 'CPU Usage', value: InfraMetricType.cpu },
    { text: 'Memory Usage', value: InfraMetricType.memory },
    { text: 'Inbound Traffic', value: InfraMetricType.rx },
    { text: 'Outbound Traffic', value: InfraMetricType.tx },
  ],
  [InfraNodeType.container]: [
    { text: 'CPU Usage', value: InfraMetricType.cpu },
    { text: 'Memory Usage', value: InfraMetricType.memory },
    { text: 'Inbound Traffic', value: InfraMetricType.rx },
    { text: 'Outbound Traffic', value: InfraMetricType.tx },
  ],
  [InfraNodeType.host]: [
    { text: 'CPU Usage', value: InfraMetricType.cpu },
    { text: 'Memory Usage', value: InfraMetricType.memory },
    { text: 'Load', value: InfraMetricType.load },
    { text: 'Inbound Traffic', value: InfraMetricType.rx },
    { text: 'Outbound Traffic', value: InfraMetricType.tx },
    { text: 'Log Rate', value: InfraMetricType.logRate },
  ],
};

const initialState = {
  isPopoverOpen: false,
};
type State = Readonly<typeof initialState>;

export class WaffleMetricControls extends React.PureComponent<Props, State> {
  public readonly state: State = initialState;
  public render() {
    const { metric } = this.props;
    const options = OPTIONS[this.props.nodeType];
    const value = metric.type;
    if (!options.length || !value) {
      throw Error('Unable to select options or value for metric.');
    }
    const currentLabel = options.find(o => o.value === metric.type);
    if (!currentLabel) {
      return 'null';
    }
    const panels: EuiContextMenuPanelDescriptor[] = [
      {
        id: 0,
        title: '',
        items: options.map(o => {
          const icon = o.value === metric.type ? 'check' : 'empty';
          const panel = { name: o.text, onClick: this.handleClick(o.value), icon };
          return panel;
        }),
      },
    ];
    const button = (
      <EuiFilterButton iconType="arrowDown" onClick={this.handleToggle}>
        Metric: {currentLabel.text}
      </EuiFilterButton>
    );

    return (
      <EuiFilterGroup>
        <EuiPopover
          isOpen={this.state.isPopoverOpen}
          id="metricsPanel"
          button={button}
          panelPaddingSize="none"
          closePopover={this.handleClose}
        >
          <EuiContextMenu initialPanelId={0} panels={panels} />
        </EuiPopover>
      </EuiFilterGroup>
    );
  }
  private handleClose = () => {
    this.setState({ isPopoverOpen: false });
  };

  private handleToggle = () => {
    this.setState(state => ({ isPopoverOpen: !state.isPopoverOpen }));
  };

  private handleClick = (value: InfraMetricType) => () => {
    this.props.onChange({ type: value });
    this.handleClose();
  };
}
