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

          // TODO: this should not exist in the UI, update the GQL resolver/schema to return
          // an object that contains these series already shaped in the way required by the visualizations.
          const { monitorChartsData } = data;
          const rttWriteRequestSeries: any[] = [];
          const rttValidateSeries: any[] = [];
          const rttContentSeries: any[] = [];
          const rttResponseSeries: any[] = [];
          const rttTcpSeries: any[] = [];
          const avgDurationSeries: any[] = [];
          const areaRttSeries: any[] = [];
          const downSeries: any[] = [];
          const upSeries: any[] = [];
          const checksSeries: any[] = [];
          const maxRtt: any[] = [];
          monitorChartsData.forEach(
            ({
              maxWriteRequest,
              maxValidate,
              maxContent,
              maxResponse,
              maxTcpRtt,
              avgDuration,
              maxDuration,
              minDuration,
              status,
            }: any) => {
              // We're summing these values because we need to know what the max value of the RTT
              // fields are in order to provide an accurate domain size for the RTT combination series.
              maxRtt.push({
                x: maxWriteRequest.x,
                y: maxWriteRequest.y + maxValidate.y + maxContent.y + maxResponse.y + maxTcpRtt.y,
              });
              // TODO: these types of computations should take place on the server and be reflected in the GQL schema
              rttWriteRequestSeries.push(maxWriteRequest);
              rttValidateSeries.push(maxValidate);
              rttContentSeries.push(maxContent);
              rttResponseSeries.push(maxResponse);
              rttTcpSeries.push(maxTcpRtt);
              avgDurationSeries.push(avgDuration);
              areaRttSeries.push({ x: minDuration.x, y0: minDuration.y, y: maxDuration.y });
              downSeries.push({ x: status.x, y: status.down });
              upSeries.push({ x: status.x, y: status.up });
              checksSeries.push({ x: status.x, y: status.total });
            }
          );

          // As above, we are building a domain size for the chart to use.
          // Without this code the chart could render data outside of the field.
          const checksDomain = upSeries.concat(downSeries).map(({ y }) => y);
          const domainLimits = [Math.min(...checksDomain), Math.max(...checksDomain)];
          const durationDomain = avgDurationSeries.concat(areaRttSeries);
          const durationLimits = [0, Math.max(...durationDomain.map(({ y }) => y))];

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
                      yDomain={durationLimits}
                      crosshairValue={this.state.crosshairLocation}
                      onCrosshairUpdate={this.updateCrosshairLocation}
                    >
                      <EuiAreaSeries
                        name={i18n.translate(
                          'xpack.uptime.monitorCharts.monitorDuration.series.durationRangeLabel',
                          {
                            defaultMessage: 'Duration range',
                          }
                        )}
                        data={areaRttSeries}
                        curve="curveBasis"
                      />
                      <EuiLineSeries
                        name={i18n.translate(
                          'xpack.uptime.monitorCharts.monitorDuration.series.meanDurationLabel',
                          {
                            defaultMessage: 'Mean duration',
                          }
                        )}
                        data={avgDurationSeries}
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
                      stackBy="y"
                      crosshairValue={this.state.crosshairLocation}
                      onCrosshairUpdate={this.updateCrosshairLocation}
                      yDomain={domainLimits}
                    >
                      <EuiAreaSeries
                        name={i18n.translate(
                          'xpack.uptime.monitorCharts.checkStatus.series.upCountLabel',
                          {
                            defaultMessage: 'Up count',
                          }
                        )}
                        data={upSeries}
                        color="green"
                      />
                      <EuiAreaSeries
                        name={i18n.translate(
                          'xpack.uptime.monitorCharts.checkStatus.series.downCountLabel',
                          {
                            defaultMessage: 'Down count',
                          }
                        )}
                        data={downSeries}
                        color="red"
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
