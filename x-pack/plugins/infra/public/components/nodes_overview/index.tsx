/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
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
import { NoData } from '../empty_states';
import { InfraLoadingPanel } from '../loading';
import { Map } from '../waffle/map';
import { ViewSwitcher } from '../waffle/view_switcher';
import { TableView } from './table';

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

export const NodesOverview = injectI18n(
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
          <NoData
            titleText={intl.formatMessage({
              id: 'xpack.infra.waffle.noDataTitle',
              defaultMessage: 'There is no data to display.',
            })}
            bodyText={intl.formatMessage({
              id: 'xpack.infra.waffle.noDataDescription',
              defaultMessage: 'Try adjusting your time or filter.',
            })}
            refetchText={intl.formatMessage({
              id: 'xpack.infra.waffle.checkNewDataButtonLabel',
              defaultMessage: 'Check for new data',
            })}
            onRefetch={() => {
              reload();
            }}
            testString="noMetricsDataPrompt"
          />
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
        <MainContainer>
          <ViewSwitcherContainer>
            <ViewSwitcher view={view} onChange={this.handleViewChange} />
          </ViewSwitcherContainer>
          {view === 'table' ? (
            <TableContainer>
              <TableView
                nodeType={nodeType}
                nodes={nodes}
                options={options}
                formatter={this.formatter}
                timeRange={timeRange}
                onFilter={this.handleDrilldown}
              />
            </TableContainer>
          ) : (
            <MapContainer>
              <Map
                nodeType={nodeType}
                nodes={nodes}
                options={options}
                formatter={this.formatter}
                timeRange={timeRange}
                onFilter={this.handleDrilldown}
                bounds={bounds}
              />
            </MapContainer>
          )}
        </MainContainer>
      );
    }

    private handleViewChange = (view: string) => this.props.onViewChange(view);

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

const MainContainer = styled.div`
  position: relative;
  flex: 1 1 auto;
`;

const TableContainer = styled.div`
  padding: ${props => props.theme.eui.paddingSizes.l};
`;

const ViewSwitcherContainer = styled.div`
  padding: ${props => props.theme.eui.paddingSizes.l};
`;

const MapContainer = styled.div`
  position: absolute;
  display: flex;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
`;
