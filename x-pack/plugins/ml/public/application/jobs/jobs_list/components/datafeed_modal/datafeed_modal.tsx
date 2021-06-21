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
  EuiCheckbox,
  EuiDatePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconTip,
  EuiLoadingChart,
  EuiModal,
  EuiModalHeader,
  EuiModalBody,
  EuiSpacer,
  EuiTabs,
  EuiTab,
  EuiText,
  EuiTitle,
  EuiToolTip,
  htmlIdGenerator,
} from '@elastic/eui';
import {
  AnnotationDomainType,
  Axis,
  Chart,
  CurveType,
  LineAnnotation,
  LineSeries,
  LineAnnotationDatum,
  Position,
  RectAnnotation,
  RectAnnotationDatum,
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
import {
  CHART_DIRECTION,
  ChartDirectionType,
  CHART_SIZE,
  tabs,
  TAB_IDS,
  TabIdsType,
} from './constants';
import { loadFullJob } from '../utils';

const dateFormatter = timeFormatter('MM-DD HH:mm:ss');
const MAX_CHART_POINTS = 480;

interface DatafeedModalProps {
  jobId: string;
  end: number;
  onClose: () => void;
}

function setLineAnnotationHeader(lineDatum: LineAnnotationDatum) {
  lineDatum.header = dateFormatter(lineDatum.dataValue);
  return lineDatum;
}

export const DatafeedModal: FC<DatafeedModalProps> = ({ jobId, end, onClose }) => {
  const [data, setData] = useState<{
    datafeedConfig: CombinedJobWithStats['datafeed_config'] | undefined;
    bucketSpan: string | undefined;
    isInitialized: boolean;
  }>({ datafeedConfig: undefined, bucketSpan: undefined, isInitialized: false });
  const [endDate, setEndDate] = useState<any>(moment(end));
  const [selectedTabId, setSelectedTabId] = useState<TabIdsType>(TAB_IDS.CHART);
  const [isLoadingChartData, setIsLoadingChartData] = useState<boolean>(false);
  const [bucketData, setBucketData] = useState<number[][]>([]);
  const [annotationData, setAnnotationData] = useState<{
    rect: RectAnnotationDatum[];
    line: LineAnnotationDatum[];
  }>({ rect: [], line: [] });
  const [modelSnapshotData, setModelSnapshotData] = useState<LineAnnotationDatum[]>([]);
  const [sourceData, setSourceData] = useState<number[][]>([]);
  const [showAnnotations, setShowAnnotations] = useState<boolean>(true);
  const [showModelSnapshots, setShowModelSnapshots] = useState<boolean>(true);

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
    if (data.bucketSpan === undefined) return;

    const newEndDate = endDate.clone();
    const unitMatch = data.bucketSpan.match(/[d | h| m | s]/g)!;
    const unit = unitMatch[0];
    const count = Number(data.bucketSpan.replace(/[^0-9]/g, ''));

    if (direction === CHART_DIRECTION.FORWARD) {
      newEndDate.add(MAX_CHART_POINTS * count, unit);
    } else {
      newEndDate.subtract(MAX_CHART_POINTS * count, unit);
    }
    setEndDate(newEndDate);
  };

  const getChartData = useCallback(async () => {
    if (data.bucketSpan === undefined) return;

    const endTimestamp = moment(endDate).valueOf();
    const unitMatch = data.bucketSpan.match(/[d | h| m | s]/g)!;
    const unit = unitMatch[0];
    const count = Number(data.bucketSpan.replace(/[^0-9]/g, ''));
    // STARTTIME = ENDTIME - (BucketSpan * MAX_CHART_POINTS)
    const startMoment = endDate.clone().subtract(MAX_CHART_POINTS * count, unit);
    const startTimestamp = moment(startMoment).valueOf();

    try {
      const chartData = await getDatafeedResultChartData(jobId, startTimestamp, endTimestamp);

      setSourceData(chartData.datafeedResults);
      setBucketData(chartData.bucketResults);
      setAnnotationData({
        rect: chartData.annotationResultsRect,
        line: chartData.annotationResultsLine.map(setLineAnnotationHeader),
      });
      setModelSnapshotData(chartData.modelSnapshotResultsLine.map(setLineAnnotationHeader));
    } catch (error) {
      const title = i18n.translate('xpack.ml.jobsList.datafeedModal.errorToastTitle', {
        defaultMessage: 'Error fetching data',
      });
      displayErrorToast(error, title);
    }
    setIsLoadingChartData(false);
  }, [endDate, data.bucketSpan]);

  const getJobData = async () => {
    try {
      const job: CombinedJobWithStats = await loadFullJob(jobId);
      setData({
        datafeedConfig: job.datafeed_config,
        bucketSpan: job.analysis_config.bucket_span,
        isInitialized: true,
      });
    } catch (error) {
      displayErrorToast(error);
    }
  };

  useEffect(function loadJobWithDatafeed() {
    getJobData();
  }, []);

  useEffect(
    function loadChartData() {
      if (data.bucketSpan !== undefined) {
        setIsLoadingChartData(true);
        getChartData();
      }
    },
    [endDate, data.bucketSpan]
  );

  const { datafeedConfig, bucketSpan, isInitialized } = data;
  const checkboxIdAnnotation = useMemo(() => htmlIdGenerator()(), []);
  const checkboxIdModelSnapshot = useMemo(() => htmlIdGenerator()(), []);

  return (
    <EuiModal
      onClose={onClose.bind(null, false)}
      className="mlDatafeedModal"
      style={{ height: '600px', minWidth: '800px' }}
    >
      <EuiModalHeader>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="xl">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  color="primary"
                  type="help"
                  content={
                    <FormattedMessage
                      id="xpack.ml.jobsList.datafeedModal.headerTooltipContent"
                      defaultMessage="Charts the event counts of the job and the source data to identify where missing data has occurred."
                    />
                  }
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h4>
                    <FormattedMessage
                      id="xpack.ml.jobsList.datafeedModal.header"
                      defaultMessage="Datafeed chart for {jobId}"
                      values={{
                        jobId,
                      }}
                    />
                  </h4>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
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
                    <EditQueryDelay
                      datafeedId={datafeedConfig.datafeed_id}
                      queryDelay={datafeedConfig.query_delay}
                      isEnabled={datafeedConfig.state === DATAFEED_STATE.STOPPED}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup>
                      <EuiFlexItem grow={false}>
                        <EuiCheckbox
                          id={checkboxIdAnnotation}
                          label={
                            <EuiText size={'xs'}>
                              <FormattedMessage
                                id="xpack.ml.jobsList.datafeedModal.showAnnotationsCheckboxLabel"
                                defaultMessage="Show annotations"
                              />
                            </EuiText>
                          }
                          checked={showAnnotations}
                          onChange={() => setShowAnnotations(!showAnnotations)}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiCheckbox
                          id={checkboxIdModelSnapshot}
                          label={
                            <EuiText size={'xs'}>
                              <FormattedMessage
                                id="xpack.ml.jobsList.datafeedModal.showModelSnapshotsCheckboxLabel"
                                defaultMessage="Show model snapshots"
                              />
                            </EuiText>
                          }
                          checked={showModelSnapshots}
                          onChange={() => setShowModelSnapshots(!showModelSnapshots)}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
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
                      {showModelSnapshots ? (
                        <LineAnnotation
                          id={i18n.translate(
                            'xpack.ml.jobsList.datafeedModal.modelSnapshotsLineSeriesId',
                            {
                              defaultMessage: 'Model snapshots',
                            }
                          )}
                          key="model-snapshots-results-line"
                          domainType={AnnotationDomainType.XDomain}
                          dataValues={modelSnapshotData}
                          marker={<EuiIcon type="asterisk" />}
                          markerPosition={Position.Top}
                          style={{
                            line: {
                              strokeWidth: 3,
                              stroke: euiTheme.euiColorVis1,
                              opacity: 0.5,
                            },
                          }}
                        />
                      ) : null}
                      {showAnnotations ? (
                        <>
                          <LineAnnotation
                            id={i18n.translate(
                              'xpack.ml.jobsList.datafeedModal.annotationLineSeriesId',
                              {
                                defaultMessage: 'Annotations line result',
                              }
                            )}
                            key="annotation-results-line"
                            domainType={AnnotationDomainType.XDomain}
                            dataValues={annotationData.line}
                            marker={<EuiIcon type="annotation" />}
                            markerPosition={Position.Top}
                            style={{
                              line: {
                                strokeWidth: 3,
                                stroke: euiTheme.euiColorDangerText,
                                opacity: 0.5,
                              },
                            }}
                          />
                          <RectAnnotation
                            key="annotation-results-rect"
                            dataValues={annotationData.rect}
                            id={i18n.translate(
                              'xpack.ml.jobsList.datafeedModal.annotationRectSeriesId',
                              {
                                defaultMessage: 'Annotations rectangle result',
                              }
                            )}
                            style={{ fill: euiTheme.euiColorDangerText }}
                          />
                        </>
                      ) : null}
                      <LineSeries
                        key={'source-results'}
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
                        key={'job-results'}
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
