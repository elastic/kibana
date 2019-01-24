/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { get, max, min } from 'lodash';
import React from 'react';
import styled from 'styled-components';

import {
  isWaffleMapGroupWithGroups,
  isWaffleMapGroupWithNodes,
} from '../../containers/waffle/type_guards';
import { InfraMetricType, InfraNodeType, InfraTimerangeInput } from '../../graphql/types';
import {
  InfraFormatterType,
  InfraWaffleData,
  InfraWaffleMapBounds,
  InfraWaffleMapGroup,
  InfraWaffleMapOptions,
} from '../../lib/lib';
import { KueryFilterQuery } from '../../store/local/waffle_filter';
import { createFormatter } from '../../utils/formatters';
import { AutoSizer } from '../auto_sizer';
import { InfraLoadingPanel } from '../loading';
import { GroupOfGroups } from './group_of_groups';
import { GroupOfNodes } from './group_of_nodes';
import { Legend } from './legend';
import { applyWaffleMapLayout } from './lib/apply_wafflemap_layout';

interface Props {
  options: InfraWaffleMapOptions;
  nodeType: InfraNodeType;
  map: InfraWaffleData;
  loading: boolean;
  reload: () => void;
  onDrilldown: (filter: KueryFilterQuery) => void;
  timeRange: InfraTimerangeInput;
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

const extractValuesFromMap = (groups: InfraWaffleMapGroup[], values: number[] = []): number[] => {
  return groups.reduce((acc: number[], group: InfraWaffleMapGroup) => {
    if (isWaffleMapGroupWithGroups(group)) {
      return acc.concat(extractValuesFromMap(group.groups, values));
    }
    if (isWaffleMapGroupWithNodes(group)) {
      return acc.concat(
        group.nodes.map(node => {
          return node.metric.value || 0;
        })
      );
    }
    return acc;
  }, values);
};

const calculateBoundsFromMap = (map: InfraWaffleData): InfraWaffleMapBounds => {
  const values = extractValuesFromMap(map);
  // if there is only one value then we need to set the bottom range to zero
  if (values.length === 1) {
    values.unshift(0);
  }
  return { min: min(values), max: max(values) };
};

export const Waffle = injectI18n(
  class extends React.Component<Props, {}> {
    public static displayName = 'Waffle';
    public render() {
      const { loading, map, reload, timeRange, intl } = this.props;
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
      } else if (!loading && map && map.length === 0) {
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
      const { metric } = this.props.options;
      const metricFormatter = get(
        METRIC_FORMATTERS,
        metric.type,
        METRIC_FORMATTERS[InfraMetricType.count]
      );
      const bounds = (metricFormatter && metricFormatter.bounds) || calculateBoundsFromMap(map);
      return (
        <AutoSizer content>
          {({ measureRef, content: { width = 0, height = 0 } }) => {
            const groupsWithLayout = applyWaffleMapLayout(map, width, height);
            return (
              <WaffleMapOuterContiner
                innerRef={(el: any) => measureRef(el)}
                data-test-subj="waffleMap"
              >
                <WaffleMapInnerContainer>
                  {groupsWithLayout.map(this.renderGroup(bounds, timeRange))}
                </WaffleMapInnerContainer>
                <Legend
                  formatter={this.formatter}
                  bounds={bounds}
                  legend={this.props.options.legend}
                />
              </WaffleMapOuterContiner>
            );
          }}
        </AutoSizer>
      );
    }

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

    private renderGroup = (bounds: InfraWaffleMapBounds, timeRange: InfraTimerangeInput) => (
      group: InfraWaffleMapGroup
    ) => {
      if (isWaffleMapGroupWithGroups(group)) {
        return (
          <GroupOfGroups
            onDrilldown={this.handleDrilldown}
            key={group.id}
            options={this.props.options}
            group={group}
            formatter={this.formatter}
            bounds={bounds}
            nodeType={this.props.nodeType}
            timeRange={timeRange}
          />
        );
      }
      if (isWaffleMapGroupWithNodes(group)) {
        return (
          <GroupOfNodes
            key={group.id}
            options={this.props.options}
            group={group}
            onDrilldown={this.handleDrilldown}
            formatter={this.formatter}
            isChild={false}
            bounds={bounds}
            nodeType={this.props.nodeType}
            timeRange={timeRange}
          />
        );
      }
    };
  }
);

const WaffleMapOuterContiner = styled.div`
  flex: 1 0 0%;
  display: flex;
  justify-content: center;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: auto;
`;

const WaffleMapInnerContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  align-content: flex-start;
  padding: 10px;
`;

const CenteredEmptyPrompt = styled(EuiEmptyPrompt)`
  align-self: center;
`;
