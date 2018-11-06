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
import { i18n } from '@kbn/i18n';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React from 'react';
import { InfraMetricInput, InfraMetricType, InfraNodeType } from '../../../common/graphql/types';
interface Props {
  nodeType: InfraNodeType;
  metric: InfraMetricInput;
  onChange: (metric: InfraMetricInput) => void;
  intl: InjectedIntl;
}

const CPUUsage = i18n.translate('xpack.infra.waffleMetricControls.optionsCPUUsageText', {
  defaultMessage: 'CPU Usage',
});

const MemoryUsage = i18n.translate('xpack.infra.waffleMetricControls.optionsMemoryUsageText', {
  defaultMessage: 'Memory Usage',
});

const InboundTraffic = i18n.translate(
  'xpack.infra.waffleMetricControls.optionsInboundTrafficText',
  {
    defaultMessage: 'Inbound Traffic',
  }
);

const OutboundTraffic = i18n.translate(
  'xpack.infra.waffleMetricControls.optionsOutboundTrafficText',
  {
    defaultMessage: 'Outbound Traffic',
  }
);

const OPTIONS = {
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
      text: i18n.translate('xpack.infra.waffleMetricControls.optionsLoadText', {
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
      text: i18n.translate('xpack.infra.waffleMetricControls.optionsHostLogRateText', {
        defaultMessage: 'Log Rate',
      }),
      value: InfraMetricType.logRate,
    },
  ],
};

const initialState = {
  isPopoverOpen: false,
};
type State = Readonly<typeof initialState>;

class WaffleMetricControlsUI extends React.PureComponent<Props, State> {
  public readonly state: State = initialState;
  public render() {
    const { metric, intl } = this.props;
    const options = OPTIONS[this.props.nodeType];
    const value = metric.type;
    if (!options.length || !value) {
      throw Error(
        intl.formatMessage({
          id: 'xpack.infra.waffleMetricControls.unableToSelectMetricErrorTitle',
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
          id="xpack.infra.waffleMetricControls.metricButtonLabel"
          defaultMessage="Metric: "
        />
        {currentLabel.text}
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

export const WaffleMetricControls = injectI18n(WaffleMetricControlsUI);
