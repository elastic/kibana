/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroup,
  EuiListGroupItem,
  EuiPanel,
  EuiPopover,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import {
  Chart,
  Axis,
  BarSeries,
  Settings,
  ScaleType,
  niceTimeFormatter,
  LegendActionProps,
  DARK_THEME,
  LIGHT_THEME,
} from '@elastic/charts';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import { MetricsResponse } from '../types';
import { useKibanaContextForPlugin } from '../../utils/use_kibana';
import { MetricTypes } from '../../../common/rest_types';
import { DatasetQualityLink } from './dataset_quality_link';
interface ChartsProps {
  data: MetricsResponse;
}
const formatBytes = (bytes: number) => {
  return numeral(bytes).format('0.0 b');
};

// TODO: Remove this when we have a title for each metric type
type ChartKey = Extract<MetricTypes, 'ingest_rate' | 'storage_retained'>;
export const chartKeyToTitleMap: Record<ChartKey, string> = {
  ingest_rate: i18n.translate('xpack.dataUsage.charts.ingestedMax', {
    defaultMessage: 'Data Ingested',
  }),
  storage_retained: i18n.translate('xpack.dataUsage.charts.retainedMax', {
    defaultMessage: 'Data Retained in Storage',
  }),
};

export const Charts: React.FC<ChartsProps> = ({ data }) => {
  const [popoverOpen, setPopoverOpen] = useState<string | null>(null);
  const theme = useEuiTheme();
  const {
    services: {
      share: {
        url: { locators },
      },
      application: { capabilities },
    },
  } = useKibanaContextForPlugin();
  const hasDataSetQualityFeature = capabilities.data_quality;
  const hasIndexManagementFeature = capabilities.index_management;

  const onClickIndexManagement = async ({ dataStreamName }: { dataStreamName: string }) => {
    // TODO: use proper index management locator https://github.com/elastic/kibana/issues/195083
    const dataQualityLocator = locators.get('MANAGEMENT_APP_LOCATOR');
    if (dataQualityLocator) {
      await dataQualityLocator.navigate({
        sectionId: 'data',
        appId: `index_management/data_streams/${dataStreamName}`,
      });
    }
  };

  const togglePopover = (streamName: string) => {
    setPopoverOpen(popoverOpen === streamName ? null : streamName);
  };
  return (
    <EuiFlexGroup direction="column">
      {data.charts.map((chart, idx) => {
        const chartTimestamps = chart.series.flatMap((series) => series.data.map((d) => d.x));
        const minTimestamp = Math.min(...chartTimestamps);
        const maxTimestamp = Math.max(...chartTimestamps);
        const tickFormat = niceTimeFormatter([minTimestamp, maxTimestamp]);

        return (
          <EuiFlexItem grow={false} key={chart.key}>
            <EuiPanel key={idx} hasShadow={false} hasBorder={true}>
              <div key={idx}>
                <EuiTitle size="xs">
                  <h5>{chartKeyToTitleMap[chart.key] || chart.key}</h5>
                </EuiTitle>
                <Chart size={{ height: 200 }}>
                  <Settings
                    theme={theme.colorMode === 'DARK' ? DARK_THEME : LIGHT_THEME}
                    showLegend={true}
                    legendPosition="right"
                    xDomain={{ min: minTimestamp, max: maxTimestamp }}
                    legendAction={({ label }: LegendActionProps) => {
                      const uniqueStreamName = `${idx}-${label}`;
                      return (
                        <EuiFlexGroup gutterSize="s" alignItems="center">
                          <EuiPopover
                            button={
                              <EuiFlexGroup gutterSize="s" alignItems="center">
                                <EuiFlexItem grow={false}>
                                  <EuiButtonIcon
                                    iconType="boxesHorizontal"
                                    aria-label="Open data stream actions"
                                    onClick={() => togglePopover(uniqueStreamName)}
                                  />
                                </EuiFlexItem>
                              </EuiFlexGroup>
                            }
                            isOpen={popoverOpen === uniqueStreamName}
                            closePopover={() => setPopoverOpen(null)}
                            anchorPosition="downRight"
                          >
                            <EuiListGroup gutterSize="none">
                              <EuiListGroupItem
                                href="#"
                                label="Copy data stream name"
                                onClick={() => undefined}
                              />
                              {hasIndexManagementFeature && (
                                <EuiListGroupItem
                                  href="#"
                                  label="Manage data stream"
                                  onClick={() =>
                                    onClickIndexManagement({
                                      dataStreamName: label,
                                    })
                                  }
                                />
                              )}
                              {hasDataSetQualityFeature && (
                                <DatasetQualityLink dataStreamName={label} />
                              )}
                            </EuiListGroup>
                          </EuiPopover>
                        </EuiFlexGroup>
                      );
                    }}
                  />
                  {chart.series.map((stream, streamIdx) => (
                    <BarSeries
                      key={streamIdx}
                      id={`${chart.key}-${stream.streamName}`}
                      name={`${stream.streamName}`}
                      data={stream.data.map((point) => [point.x, point.y])}
                      xScaleType={ScaleType.Time}
                      yScaleType={ScaleType.Linear}
                      xAccessor={0}
                      yAccessors={[1]}
                      stackAccessors={[0]}
                    />
                  ))}

                  <Axis
                    id="bottom-axis"
                    position="bottom"
                    tickFormat={tickFormat}
                    gridLine={{ visible: false }}
                  />

                  <Axis
                    id="left-axis"
                    position="left"
                    gridLine={{ visible: true }}
                    tickFormat={(d) => formatBytes(d)}
                  />
                </Chart>
              </div>
            </EuiPanel>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
