/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
import {
  EuiButtonEmpty,
  EuiDatePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingChart,
  EuiModal,
  EuiModalHeader,
  EuiModalBody,
  EuiSelect,
  EuiSpacer,
  EuiTabs,
  EuiTab,
  EuiToolTip,
} from '@elastic/eui';
import {
  Axis,
  Chart,
  CurveType,
  LineSeries,
  Position,
  ScaleType,
  Settings,
  timeFormatter,
} from '@elastic/charts';

import { DATAFEED_STATE } from '../../../../../../common/constants/states';
import { CombinedJobWithStats } from '../../../../../../common/types/anomaly_detection_jobs';
import { useToastNotificationService } from '../../../../services/toast_notification_service';
import { useMlApiContext } from '../../../../contexts/kibana';
import { useCurrentEuiTheme } from '../../../../components/color_range_legend';
import { JobMessagesPane } from '../job_details/job_messages_pane';
import { EditQueryDelay } from './edit_query_delay';
import { getIntervalOptions } from './get_interval_options';
import {
  CHART_DIRECTION,
  ChartDirectionType,
  CHART_SIZE,
  tabs,
  TAB_IDS,
  TabIdsType,
} from './constants';
import { loadFullJob } from '../utils';

const dateFormatter = timeFormatter('MM-DD HH:mm');

interface DatafeedModalProps {
  jobId: string;
  end: number;
  onClose: (deletionApproved?: boolean) => void;
}

export const DatafeedModal: FC<DatafeedModalProps> = ({ jobId, end, onClose }) => {
  const [data, setData] = useState<{
    datafeedConfig: CombinedJobWithStats['datafeed_config'] | undefined;
    bucketSpan: string | undefined;
    isInitialized: boolean;
  }>({ datafeedConfig: undefined, bucketSpan: undefined, isInitialized: false });
  const [endDate, setEndDate] = useState<any>(moment(end));
  const [interval, setInterval] = useState<string | undefined>();
  const [selectedTabId, setSelectedTabId] = useState<TabIdsType>(TAB_IDS.CHART);
  const [isLoadingChartData, setIsLoadingChartData] = useState<boolean>(false);
  const [bucketData, setBucketData] = useState<number[][]>([]);
  const [sourceData, setSourceData] = useState<number[][]>([]);

  const {
    results: { getDatafeedResultChartData },
  } = useMlApiContext();
  const { displayErrorToast } = useToastNotificationService();
  const { euiTheme } = useCurrentEuiTheme();

  const onSelectedTabChanged = (id: TabIdsType) => {
    setSelectedTabId(id);
  };

  const renderTabs = useCallback(
    () =>
      tabs.map((tab, index) => (
        <EuiTab
          onClick={() => onSelectedTabChanged(tab.id)}
          isSelected={tab.id === selectedTabId}
          disabled={tab.disabled}
          key={index}
        >
          {tab.name}
        </EuiTab>
      )),
    [selectedTabId]
  );

  const handleChange = (date: moment.Moment) => setEndDate(date);

  const handleEndDateChange = (direction: ChartDirectionType) => {
    if (interval === undefined) return;

    const newEndDate = endDate.clone();
    const [count, type] = interval.split(' ');

    if (direction === CHART_DIRECTION.FORWARD) {
      newEndDate.add(Number(count), type);
    } else {
      newEndDate.subtract(Number(count), type);
    }
    setEndDate(newEndDate);
  };

  const getChartData = useCallback(async () => {
    if (interval === undefined) return;

    const endTimestamp = moment(endDate).valueOf();
    const [count, type] = interval.split(' ');
    const startMoment = endDate.clone().subtract(Number(count), type);
    const startTimestamp = moment(startMoment).valueOf();

    try {
      const chartData = await getDatafeedResultChartData(jobId, startTimestamp, endTimestamp);

      setSourceData(chartData.datafeedResults);
      setBucketData(chartData.bucketResults);
    } catch (error) {
      const title = i18n.translate('xpack.ml.jobsList.datafeedModal.errorToastTitle', {
        defaultMessage: 'Error fetching data',
      });
      displayErrorToast(error, title);
    }
    setIsLoadingChartData(false);
  }, [endDate, interval]);

  const getJobData = async () => {
    try {
      const job: CombinedJobWithStats = await loadFullJob(jobId);
      setData({
        datafeedConfig: job.datafeed_config,
        bucketSpan: job.analysis_config.bucket_span,
        isInitialized: true,
      });
      const intervalOptions = getIntervalOptions(job.analysis_config.bucket_span);
      const initialInterval = intervalOptions.length
        ? intervalOptions[intervalOptions.length - 1]
        : undefined;
      setInterval(initialInterval?.value || '72 hours');
    } catch (error) {
      displayErrorToast(error);
    }
  };

  useEffect(function loadJobWithDatafeed() {
    getJobData();
  }, []);

  useEffect(
    function loadChartData() {
      if (interval !== undefined) {
        setIsLoadingChartData(true);
        getChartData();
      }
    },
    [endDate, interval]
  );

  const { datafeedConfig, bucketSpan, isInitialized } = data;

  const intervalOptions = useMemo(() => {
    if (bucketSpan === undefined) return [];
    return getIntervalOptions(bucketSpan);
  }, [bucketSpan]);

  return (
    <EuiModal
      onClose={onClose.bind(null, false)}
      className="mlDatafeedModal"
      style={{ height: '600px', minWidth: '800px' }}
    >
      <EuiModalHeader>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="xl">
          <EuiFlexItem grow={false}>
            <FormattedMessage
              id="xpack.ml.jobsList.datafeedModal.header"
              defaultMessage="{jobId}"
              values={{
                jobId,
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiDatePicker
              aria-label={i18n.translate('xpack.ml.jobsList.datafeedModal.chartIntervalEndTime', {
                defaultMessage: 'Chart interval end time',
              })}
              showTimeSelect
              selected={endDate}
              onChange={handleChange}
              popoverPlacement="left-start"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiTabs size="s">{renderTabs()}</EuiTabs>
        <EuiSpacer size="m" />
        {isLoadingChartData || isInitialized === false ? <EuiLoadingChart size="l" /> : null}
        {!isLoadingChartData &&
          isInitialized &&
          selectedTabId === TAB_IDS.CHART &&
          datafeedConfig !== undefined &&
          bucketSpan && (
            <EuiFlexGroup direction="column">
              <EuiFlexItem grow={false}>
                <EuiFlexGroup justifyContent="spaceBetween">
                  <EuiFlexItem grow={false}>
                    <EuiSelect
                      options={intervalOptions}
                      value={interval}
                      onChange={(e) => setInterval(e.target.value)}
                      aria-label={i18n.translate(
                        'xpack.ml.jobsList.datafeedModal.intervalSelection',
                        {
                          defaultMessage: 'Datafeed modal chart interval selection',
                        }
                      )}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EditQueryDelay
                      datafeedId={datafeedConfig.datafeed_id}
                      queryDelay={datafeedConfig.query_delay}
                      isEnabled={datafeedConfig.state === DATAFEED_STATE.STOPPED}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFlexGroup gutterSize="none" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiToolTip
                      content={
                        <FormattedMessage
                          id="xpack.ml.jobsList.datafeedModal.chartLeftArrowTooltip"
                          defaultMessage="Previous time window"
                        />
                      }
                    >
                      <EuiButtonEmpty
                        aria-label={i18n.translate(
                          'xpack.ml.jobsList.datafeedModal.chartIntervalLeftArrow',
                          {
                            defaultMessage: 'Previous time window',
                          }
                        )}
                        color="primary"
                        size="l"
                        onClick={() => {
                          handleEndDateChange(CHART_DIRECTION.BACK);
                        }}
                        iconType="arrowLeft"
                      />
                    </EuiToolTip>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <Chart size={CHART_SIZE}>
                      <Settings
                        showLegend
                        legendPosition={Position.Bottom}
                        theme={{
                          lineSeriesStyle: {
                            point: {
                              visible: false,
                            },
                          },
                        }}
                      />
                      <Axis
                        id="bottom"
                        position={Position.Bottom}
                        showOverlappingTicks
                        tickFormat={dateFormatter}
                        title={i18n.translate('xpack.ml.jobsList.datafeedModal.xAxisTitle', {
                          defaultMessage: 'Bucket span ({bucketSpan})',
                          values: { bucketSpan },
                        })}
                      />
                      <Axis
                        id="left"
                        title={i18n.translate('xpack.ml.jobsList.datafeedModal.yAxisTitle', {
                          defaultMessage: 'Count',
                        })}
                        position={Position.Left}
                      />
                      <LineSeries
                        color={euiTheme.euiColorPrimary}
                        id={i18n.translate('xpack.ml.jobsList.datafeedModal.sourceSeriesId', {
                          defaultMessage: 'Source indices',
                        })}
                        xScaleType={ScaleType.Time}
                        yScaleType={ScaleType.Linear}
                        xAccessor={0}
                        yAccessors={[1]}
                        data={sourceData}
                        curve={CurveType.LINEAR}
                      />
                      <LineSeries
                        color={euiTheme.euiColorAccentText}
                        id={i18n.translate('xpack.ml.jobsList.datafeedModal.bucketSeriesId', {
                          defaultMessage: 'Job results',
                        })}
                        xScaleType={ScaleType.Time}
                        yScaleType={ScaleType.Linear}
                        xAccessor={0}
                        yAccessors={[1]}
                        data={bucketData}
                        curve={CurveType.LINEAR}
                      />
                    </Chart>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiToolTip
                      content={
                        <FormattedMessage
                          id="xpack.ml.jobsList.datafeedModal.chartRightArrowTooltip"
                          defaultMessage="Next time window"
                        />
                      }
                    >
                      <EuiButtonEmpty
                        aria-label={i18n.translate(
                          'xpack.ml.jobsList.datafeedModal.chartIntervalRightArrow',
                          {
                            defaultMessage: 'Next time window',
                          }
                        )}
                        color="primary"
                        size="l"
                        onClick={() => {
                          handleEndDateChange(CHART_DIRECTION.FORWARD);
                        }}
                        iconType="arrowRight"
                      />
                    </EuiToolTip>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        {!isLoadingChartData && selectedTabId === TAB_IDS.MESSAGES ? (
          <JobMessagesPane jobId={jobId} />
        ) : null}
      </EuiModalBody>
    </EuiModal>
  );
};
