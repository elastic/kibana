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
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React from 'react';

import { InfraMetricInput, InfraMetricType, InfraNodeType } from '../../graphql/types';

interface Props {
  nodeType: InfraNodeType;
  metric: InfraMetricInput;
  onChange: (metric: InfraMetricInput) => void;
  intl: InjectedIntl;
}

let OPTIONS: { [P in InfraNodeType]: Array<{ text: string; value: InfraMetricType }> };
const getOptions = (
  nodeType: InfraNodeType,
  intl: InjectedIntl
): Array<{ text: string; value: InfraMetricType }> => {
  if (!OPTIONS) {
    const CPUUsage = intl.formatMessage({
      id: 'xpack.infra.waffle.metricOptions.cpuUsageText',
      defaultMessage: 'CPU Usage',
    });

    const MemoryUsage = intl.formatMessage({
      id: 'xpack.infra.waffle.metricOptions.memoryUsageText',
      defaultMessage: 'Memory Usage',
    });

    const InboundTraffic = intl.formatMessage({
      id: 'xpack.infra.waffle.metricOptions.inboundTrafficText',
      defaultMessage: 'Inbound Traffic',
    });

    const OutboundTraffic = intl.formatMessage({
      id: 'xpack.infra.waffle.metricOptions.outboundTrafficText',
      defaultMessage: 'Outbound Traffic',
    });

    OPTIONS = {
      [InfraNodeType.pod]: [
        {
          text: CPUUsage,
          value: InfraMetricType.cpu,
        },
        {
          text: MemoryUsage,
          value: InfraMetricType.memory,
        },
        {
          text: InboundTraffic,
          value: InfraMetricType.rx,
        },
        {
          text: OutboundTraffic,
          value: InfraMetricType.tx,
        },
      ],
      [InfraNodeType.container]: [
        {
          text: CPUUsage,
          value: InfraMetricType.cpu,
        },
        {
          text: MemoryUsage,
          value: InfraMetricType.memory,
        },
        {
          text: InboundTraffic,
          value: InfraMetricType.rx,
        },
        {
          text: OutboundTraffic,
          value: InfraMetricType.tx,
        },
      ],
      [InfraNodeType.host]: [
        {
          text: CPUUsage,
          value: InfraMetricType.cpu,
        },
        {
          text: MemoryUsage,
          value: InfraMetricType.memory,
        },
        {
          text: intl.formatMessage({
            id: 'xpack.infra.waffle.metricOptions.loadText',
            defaultMessage: 'Load',
          }),
          value: InfraMetricType.load,
        },
        {
          text: InboundTraffic,
          value: InfraMetricType.rx,
        },
        {
          text: OutboundTraffic,
          value: InfraMetricType.tx,
        },
        {
          text: intl.formatMessage({
            id: 'xpack.infra.waffle.metricOptions.hostLogRateText',
            defaultMessage: 'Log Rate',
          }),
          value: InfraMetricType.logRate,
        },
      ],
    };
  }

  return OPTIONS[nodeType];
};

const initialState = {
  isPopoverOpen: false,
};
type State = Readonly<typeof initialState>;

export const WaffleMetricControls = injectI18n(
  class extends React.PureComponent<Props, State> {
    public static displayName = 'WaffleMetricControls';
    public readonly state: State = initialState;
    public render() {
      const { metric, nodeType, intl } = this.props;
      const options = getOptions(nodeType, intl);
      const value = metric.type;

      if (!options.length || !value) {
        throw Error(
          intl.formatMessage({
            id: 'xpack.infra.waffle.unableToSelectMetricErrorTitle',
            defaultMessage: 'Unable to select options or value for metric.',
          })
        );
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
          <FormattedMessage
            id="xpack.infra.waffle.metricButtonLabel"
            defaultMessage="Metric: {selectedMetric}"
            values={{ selectedMetric: currentLabel.text }}
          />
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
);
