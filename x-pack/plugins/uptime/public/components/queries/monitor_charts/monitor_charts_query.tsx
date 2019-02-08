/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  // @ts-ignore missing typings
  EuiAreaSeries,
  EuiFlexGroup,
  EuiFlexItem,
  // @ts-ignore missing typings
  EuiLineSeries,
  EuiPanel,
  // @ts-ignore missing typings
  EuiSeriesChart,
  // @ts-ignore missing typings
  EuiSeriesChartUtils,
  // @ts-ignore missing typings
  EuiSpacer,
  // @ts-ignore missing typings
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Fragment } from 'react';
import { Query } from 'react-apollo';
import { MonitorChart } from '../../../../common/graphql/types';
import { UptimeCommonProps } from '../../../uptime_app';
import { createGetMonitorChartsQuery } from './get_monitor_charts';

interface MonitorChartsProps {
  monitorId: string;
}

interface MonitorChartsState {
  crosshairLocation: number;
}

type Props = MonitorChartsProps & UptimeCommonProps;

export class MonitorChartsQuery extends React.Component<Props, MonitorChartsState> {
  constructor(props: Props) {
    super(props);
    this.state = { crosshairLocation: 0 };
  }

  public render() {
    const {
      colors: { primary, secondary, danger },
      dateRangeStart,
      dateRangeEnd,
      monitorId,
      autorefreshIsPaused,
      autorefreshInterval,
    } = this.props;
    return (
      <Query
        pollInterval={autorefreshIsPaused ? undefined : autorefreshInterval}
        query={createGetMonitorChartsQuery}
        variables={{ dateRangeStart, dateRangeEnd, monitorId }}
      >
        {({ loading, error, data }) => {
          if (loading) {
            return i18n.translate('xpack.uptime.monitorCharts.loadingMessage', {
              defaultMessage: 'Loading…',
            });
          }
          if (error) {
            return i18n.translate('xpack.uptime.monitorCharts.errorMessage', {
              values: { message: error.message },
              defaultMessage: 'Error {message}',
            });
          }

          const {
            monitorChartsData: {
              durationArea,
              durationLine,
              durationMaxValue,
              status,
              statusMaxCount,
            },
          }: { monitorChartsData: MonitorChart } = data;

          // These limits provide domain sizes for the charts
          const checkDomainLimits = [0, statusMaxCount];
          const durationDomainLimits = [0, durationMaxValue];

          return (
            <Fragment>
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiTitle size="xs">
                    <h4>
                      <FormattedMessage
                        id="xpack.uptime.monitorCharts.monitorDuration.titleLabel"
                        defaultMessage="Monitor Duration ms"
                        description="The 'ms' is an abbreviation for milliseconds."
                      />
                    </h4>
                  </EuiTitle>

                  <EuiPanel style={{ maxWidth: 520, maxHeight: 220 }}>
                    <EuiSeriesChart
                      margins={{ left: 60, right: 40, top: 10, bottom: 40 }}
                      width={500}
                      height={200}
                      xType={EuiSeriesChartUtils.SCALE.TIME}
                      xCrosshairFormat="YYYY-MM-DD hh:mmZ"
                      yDomain={durationDomainLimits}
                      crosshairValue={this.state.crosshairLocation}
                      onCrosshairUpdate={this.updateCrosshairLocation}
                    >
                      <EuiAreaSeries
                        color={secondary}
                        name={i18n.translate(
                          'xpack.uptime.monitorCharts.monitorDuration.series.durationRangeLabel',
                          {
                            defaultMessage: 'Duration range',
                          }
                        )}
                        data={durationArea}
                        curve="curveBasis"
                      />
                      <EuiLineSeries
                        color={primary}
                        name={i18n.translate(
                          'xpack.uptime.monitorCharts.monitorDuration.series.meanDurationLabel',
                          {
                            defaultMessage: 'Mean duration',
                          }
                        )}
                        data={durationLine}
                      />
                    </EuiSeriesChart>
                  </EuiPanel>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiTitle size="xs">
                    <h4>
                      <FormattedMessage
                        id="xpack.uptime.monitorCharts.checkStatus.title"
                        defaultMessage="Check status"
                      />
                    </h4>
                  </EuiTitle>
                  <EuiPanel style={{ maxWidth: 520, maxHeight: 220 }}>
                    <EuiSeriesChart
                      margins={{ left: 60, right: 40, top: 10, bottom: 40 }}
                      width={500}
                      height={200}
                      xType={EuiSeriesChartUtils.SCALE.TIME}
                      xCrosshairFormat="YYYY-MM-DD hh:mmZ"
                      stackBy="y"
                      crosshairValue={this.state.crosshairLocation}
                      onCrosshairUpdate={this.updateCrosshairLocation}
                      yDomain={checkDomainLimits}
                    >
                      <EuiAreaSeries
                        name={i18n.translate(
                          'xpack.uptime.monitorCharts.checkStatus.series.upCountLabel',
                          {
                            defaultMessage: 'Up count',
                          }
                        )}
                        data={status.map(({ x, up }) => ({ x, y: up }))}
                        curve="curveBasis"
                        color={primary}
                      />
                      <EuiAreaSeries
                        name={i18n.translate(
                          'xpack.uptime.monitorCharts.checkStatus.series.downCountLabel',
                          {
                            defaultMessage: 'Down count',
                          }
                        )}
                        data={status.map(({ x, down }) => ({ x, y: down }))}
                        color={danger}
                      />
                    </EuiSeriesChart>
                  </EuiPanel>
                </EuiFlexItem>
              </EuiFlexGroup>
            </Fragment>
          );
        }}
      </Query>
    );
  }
  private updateCrosshairLocation = (crosshairLocation: number) =>
    this.setState({ crosshairLocation });
}
