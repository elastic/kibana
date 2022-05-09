/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import moment from 'moment';
import { partialRight } from 'lodash';
import {
  EuiPage,
  EuiLink,
  EuiPageBody,
  EuiPageContent,
  EuiPanel,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import { formatMetric } from '../../../lib/format_number';
import { ClusterStatus } from '../cluster_status';
import { Sparkline } from '../../sparkline';
import { EuiMonitoringSSPTable } from '../../table';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { getSafeForExternalLink } from '../../../lib/get_safe_for_external_link';

export class PipelineListing extends Component {
  tooltipXValueFormatter(xValue, dateFormat) {
    return moment(xValue).format(dateFormat);
  }

  tooltipYValueFormatter(yValue, format, units) {
    return formatMetric(yValue, format, units);
  }

  getColumns() {
    const { onBrush, dateFormat } = this.props;

    return [
      {
        name: i18n.translate('xpack.monitoring.logstash.pipelines.idTitle', {
          defaultMessage: 'ID',
        }),
        field: 'id',
        sortable: true,
        render: (id) => (
          <EuiLink data-test-subj="id" href={getSafeForExternalLink(`#/logstash/pipelines/${id}`)}>
            {id}
          </EuiLink>
        ),
      },
      {
        name: i18n.translate('xpack.monitoring.logstash.pipelines.eventsEmittedRateTitle', {
          defaultMessage: 'Events Emitted Rate',
        }),
        field: 'latestThroughput',
        sortable: true,
        render: (value, pipeline) => {
          const throughput = pipeline.metrics.throughput;
          return (
            <EuiFlexGroup gutterSize="none" alignItems="center">
              <EuiFlexItem>
                <Sparkline
                  series={throughput.data}
                  onBrush={onBrush}
                  tooltip={{
                    xValueFormatter: (value) => this.tooltipXValueFormatter(value, dateFormat),
                    yValueFormatter: partialRight(
                      this.tooltipYValueFormatter,
                      throughput.metric.format,
                      throughput.metric.units
                    ),
                  }}
                  options={{ xaxis: throughput.timeRange }}
                />
              </EuiFlexItem>
              <EuiFlexItem className="monTableCell__number" data-test-subj="eventsEmittedRate">
                {formatMetric(value, '0.[0]a', throughput.metric.units)}
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
      {
        name: i18n.translate('xpack.monitoring.logstash.pipelines.numberOfNodesTitle', {
          defaultMessage: 'Number of Nodes',
        }),
        field: 'latestNodesCount',
        sortable: true,
        render: (value, pipeline) => {
          const nodesCount = pipeline.metrics.nodesCount;
          return (
            <EuiFlexGroup gutterSize="none" alignItems="center">
              <EuiFlexItem>
                <Sparkline
                  series={nodesCount.data}
                  onBrush={onBrush}
                  tooltip={{
                    xValueFormatter: (value) => this.tooltipXValueFormatter(value, dateFormat),
                    yValueFormatter: partialRight(
                      this.tooltipYValueFormatter,
                      nodesCount.metric.format,
                      nodesCount.metric.units
                    ),
                  }}
                  options={{ xaxis: nodesCount.timeRange }}
                />
              </EuiFlexItem>
              <EuiFlexItem className="monTableCell__number" data-test-subj="nodeCount">
                {formatMetric(value, '0a')}
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
    ];
  }

  renderStats() {
    if (this.props.statusComponent) {
      const Component = this.props.statusComponent;
      return <Component stats={this.props.stats} />;
    }

    return <ClusterStatus stats={this.props.stats} />;
  }

  render() {
    const { data, sorting, pagination, onTableChange, upgradeMessage, className, ...props } =
      this.props;

    const sortingOptions = sorting || { field: 'id', direction: 'asc' };
    if (sortingOptions.field === 'name') {
      sortingOptions.field = 'id';
    }
    const columns = this.getColumns();

    return (
      <EuiPage>
        <EuiPageBody>
          <EuiScreenReaderOnly>
            <h1>
              <FormattedMessage
                id="xpack.monitoring.logstash.pipline_listing.heading"
                defaultMessage="Logstash pipelines"
              />
            </h1>
          </EuiScreenReaderOnly>
          <EuiPanel>{this.renderStats()}</EuiPanel>
          <EuiSpacer size="m" />
          <EuiPageContent>
            <EuiMonitoringSSPTable
              className={className || 'logstashNodesTable'}
              rows={data}
              columns={columns}
              sorting={sortingOptions}
              message={upgradeMessage}
              pagination={pagination}
              search={{
                box: {
                  placeholder: i18n.translate(
                    'xpack.monitoring.logstash.filterPipelinesPlaceholder',
                    {
                      defaultMessage: 'Filter Pipelines…',
                    }
                  ),
                },
              }}
              onTableChange={onTableChange}
              {...props}
            />
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
}
