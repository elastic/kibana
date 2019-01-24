/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiButton, EuiButtonEmpty, EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { get, max, min } from 'lodash';
import React from 'react';
import styled from 'styled-components';

import {
  InfraMetricType,
  InfraNode,
  InfraNodeType,
  InfraTimerangeInput,
} from '../../graphql/types';
import { InfraFormatterType, InfraWaffleMapBounds, InfraWaffleMapOptions } from '../../lib/lib';
import { KueryFilterQuery } from '../../store/local/waffle_filter';
import { createFormatter } from '../../utils/formatters';
import { InfraLoadingPanel } from '../loading';
import { TableView } from './table';
import { WaffleMap } from './waffle_map';

interface Props {
  options: InfraWaffleMapOptions;
  nodeType: InfraNodeType;
  nodes: InfraNode[];
  loading: boolean;
  reload: () => void;
  onDrilldown: (filter: KueryFilterQuery) => void;
  timeRange: InfraTimerangeInput;
  onViewChange: (view: string) => void;
  view: string;
  intl: InjectedIntl;
}

interface MetricFormatter {
  formatter: InfraFormatterType;
  template: string;
  bounds?: { min: number; max: number };
}

interface MetricFormatters {
  [key: string]: MetricFormatter;
}

const METRIC_FORMATTERS: MetricFormatters = {
  [InfraMetricType.count]: { formatter: InfraFormatterType.number, template: '{{value}}' },
  [InfraMetricType.cpu]: {
    formatter: InfraFormatterType.percent,
    template: '{{value}}',
    bounds: { min: 0, max: 1 },
  },
  [InfraMetricType.memory]: {
    formatter: InfraFormatterType.percent,
    template: '{{value}}',
    bounds: { min: 0, max: 1 },
  },
  [InfraMetricType.rx]: { formatter: InfraFormatterType.bits, template: '{{value}}/s' },
  [InfraMetricType.tx]: { formatter: InfraFormatterType.bits, template: '{{value}}/s' },
  [InfraMetricType.logRate]: {
    formatter: InfraFormatterType.abbreviatedNumber,
    template: '{{value}}/s',
  },
};

const calculateBoundsFromNodes = (nodes: InfraNode[]): InfraWaffleMapBounds => {
  const values = nodes.map(node => node.metric.value);
  // if there is only one value then we need to set the bottom range to zero
  if (values.length === 1) {
    values.unshift(0);
  }
  return { min: min(values) || 0, max: max(values) || 0 };
};

export const Waffle = injectI18n(
  class extends React.Component<Props, {}> {
    public static displayName = 'Waffle';
    public render() {
      const { loading, nodes, nodeType, reload, intl, view, options, timeRange } = this.props;
      if (loading) {
        return (
          <InfraLoadingPanel
            height="100%"
            width="100%"
            text={intl.formatMessage({
              id: 'xpack.infra.waffle.loadingDataText',
              defaultMessage: 'Loading data',
            })}
          />
        );
      } else if (!loading && nodes && nodes.length === 0) {
        return (
          <CenteredEmptyPrompt
            title={
              <h2>
                <FormattedMessage
                  id="xpack.infra.waffle.noDataTitle"
                  defaultMessage="There is no data to display."
                />
              </h2>
            }
            titleSize="m"
            body={
              <p>
                <FormattedMessage
                  id="xpack.infra.waffle.noDataDescription"
                  defaultMessage="Try adjusting your time or filter."
                />
              </p>
            }
            actions={
              <EuiButton
                iconType="refresh"
                color="primary"
                fill
                onClick={() => {
                  reload();
                }}
              >
                <FormattedMessage
                  id="xpack.infra.waffle.checkNewDataButtonLabel"
                  defaultMessage="Check for new data"
                />
              </EuiButton>
            }
            data-test-subj="noMetricsDataPrompt"
          />
        );
      }
      if (view === 'table') {
        return (
          <div>
            <EuiButtonEmpty size="s" onClick={this.handleViewChange('map')} role="link">
              Switch to Map View
            </EuiButtonEmpty>
            <div style={{ padding: 16 }}>
              <TableView
                nodeType={nodeType}
                nodes={nodes}
                options={options}
                formatter={this.formatter}
                timeRange={timeRange}
                onFilter={this.handleDrilldown}
              />
            </div>
          </div>
        );
      }
      const { metric } = this.props.options;
      const metricFormatter = get(
        METRIC_FORMATTERS,
        metric.type,
        METRIC_FORMATTERS[InfraMetricType.count]
      );
      const bounds = (metricFormatter && metricFormatter.bounds) || calculateBoundsFromNodes(nodes);
      return (
        <React.Fragment>
          <EuiButtonEmpty size="s" onClick={this.handleViewChange('table')} role="link">
            Switch to Table View
          </EuiButtonEmpty>
          <WaffleMap
            nodeType={nodeType}
            nodes={nodes}
            options={options}
            formatter={this.formatter}
            timeRange={timeRange}
            onFilter={this.handleDrilldown}
            bounds={bounds}
          />
        </React.Fragment>
      );
    }

    private handleViewChange = (view: string) => () => this.props.onViewChange(view);

    // TODO: Change this to a real implimentation using the tickFormatter from the prototype as an example.
    private formatter = (val: string | number) => {
      const { metric } = this.props.options;
      const metricFormatter = get(
        METRIC_FORMATTERS,
        metric.type,
        METRIC_FORMATTERS[InfraMetricType.count]
      );
      if (val == null) {
        return '';
      }
      const formatter = createFormatter(metricFormatter.formatter, metricFormatter.template);
      return formatter(val);
    };

    private handleDrilldown = (filter: string) => {
      this.props.onDrilldown({
        kind: 'kuery',
        expression: filter,
      });
      return;
    };
  }
);

const CenteredEmptyPrompt = styled(EuiEmptyPrompt)`
  align-self: center;
`;
