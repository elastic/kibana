/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import moment from 'moment';
// import { estypes } from '@elastic/elasticsearch';
import {
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
} from '@elastic/eui';
import {
  Axis,
  Chart,
  ChartSizeArray,
  CurveType,
  LineSeries,
  // niceTimeFormatByDay,
  Position,
  ScaleType,
  Settings,
  timeFormatter,
} from '@elastic/charts';
import { mlResultsService } from '../../../../services/results_service';
import { useToastNotificationService } from '../../../../services/toast_notification_service';
import { ml } from '../../../../services/ml_api_service';
import { JobMessagesPane } from '../job_details/job_messages_pane';
import { EditQueryDelay } from './edit_query_delay';

// TODO: update any types
interface DatafeedModalProps {
  datafeedConfig: any;
  bucketSpan: number;
  end: number;
  onClose: (deletionApproved?: boolean) => void;
  timefield: string;
}

const CHART_SIZE: ChartSizeArray = ['100%', 400];

const TAB_IDS = { CHART: 'chart', MESSAGES: 'messages', ANNOTATIONS: 'annotations' };

const dateFormatter = timeFormatter('MM-DD HH:mm');

const tabs = [
  {
    id: TAB_IDS.CHART,
    name: i18n.translate('xpack.ml.jobsList.datafeedModal.chartTabName', {
      defaultMessage: 'Chart',
    }),
    disabled: false,
  },
  {
    id: TAB_IDS.MESSAGES,
    name: i18n.translate('xpack.ml.jobsList.datafeedModal.messagesTabName', {
      defaultMessage: 'Messages',
    }),
    disabled: false,
  },
  {
    id: TAB_IDS.ANNOTATIONS,
    name: i18n.translate('xpack.ml.jobsList.datafeedModal.annotationsTabName', {
      defaultMessage: 'Annotations',
    }),
    disabled: false,
  },
];

const intervalOptions = [
  {
    value: '24 hours',
    text: i18n.translate('xpack.ml.jobsList.datafeedModal.24hourOption', {
      defaultMessage: 'Last {count} hours',
      values: { count: 24 },
    }),
  },
  {
    value: '3 days',
    text: i18n.translate('xpack.ml.jobsList.datafeedModal.3dayOption', {
      defaultMessage: 'Last {count} days',
      values: { count: 3 },
    }),
  },
  {
    value: '7 days',
    text: i18n.translate('xpack.ml.jobsList.datafeedModal.7dayOption', {
      defaultMessage: 'Last {count} days',
      values: { count: 7 },
    }),
  },
  {
    value: '14 days',
    text: i18n.translate('xpack.ml.jobsList.datafeedModal.14dayOption', {
      defaultMessage: 'Last {count} days',
      values: { count: 14 },
    }),
  },
];

export const DatafeedModal: FC<DatafeedModalProps> = ({
  datafeedConfig,
  bucketSpan,
  end,
  onClose,
  timefield,
}) => {
  const [endDate, setEndDate] = useState<any>(moment(end));
  const [interval, setInterval] = useState<string>('7 days');
  const [selectedTabId, setSelectedTabId] = useState<string>('chart');
  const [isLoadingChartData, setIsLoadingChartData] = useState<boolean>(false);
  const [bucketData, setBucketData] = useState<any>([]);
  const [sourceData, setSourceData] = useState<any>([]);

  const { displayErrorToast } = useToastNotificationService();

  const { job_id: jobId } = datafeedConfig;

  const onSelectedTabChanged = (id: string) => {
    setSelectedTabId(id);
  };

  // TODO: useCallback or useMemo
  const renderTabs = () =>
    tabs.map((tab, index) => (
      <EuiTab
        onClick={() => onSelectedTabChanged(tab.id)}
        isSelected={tab.id === selectedTabId}
        disabled={tab.disabled}
        key={index}
      >
        {tab.name}
      </EuiTab>
    ));

  const handleChange = (date: any) => setEndDate(date);

  // TODO: error handling and useCallback
  const getChartData = useCallback(async () => {
    const endTimestamp = moment(endDate).unix() * 1000;
    const [count, type] = interval.split(' ');
    const startMoment = endDate.subtract(Number(count), type);
    const startTimestamp = moment(startMoment).unix() * 1000;

    // TODO: combine existing datafeedConfig query with the range
    const esSearchRequest = {
      index: datafeedConfig.indices.join(','),
      body: {
        query: {
          range: {
            [timefield]: { gte: startTimestamp, lte: endTimestamp },
          },
        },
        aggs: {
          doc_count_by_bucket_span: {
            date_histogram: {
              field: timefield,
              fixed_interval: bucketSpan,
            },
          },
        },
        size: 0,
      },
    };

    try {
      const bucketResp = await mlResultsService.getBucketResultsForChart(
        jobId,
        String(startTimestamp),
        String(endTimestamp),
        true
      );

      const searchResp: any = await ml.esSearch(esSearchRequest); // estypes.SearchResponse
      const sourceResults =
        searchResp.aggregations?.doc_count_by_bucket_span?.buckets.map((result: any) => [
          result.key,
          result.doc_count,
        ]) || [];
      setSourceData(sourceResults);

      setBucketData(bucketResp.results.data);
    } catch (error) {
      const title = i18n.translate('xpack.ml.jobsList.datafeedModal.errorToastTitle', {
        defaultMessage: 'Error fetching data',
      });
      displayErrorToast(error, title);
    }
    setIsLoadingChartData(false);
  }, [endDate, interval]);

  useEffect(
    function loadChartData() {
      setIsLoadingChartData(true);
      getChartData();
    },
    [endDate, interval]
  );

  return (
    <EuiModal onClose={onClose.bind(null, false)} style={{ height: '600px', minWidth: '800px' }}>
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
            <EuiDatePicker showTimeSelect selected={endDate} onChange={handleChange} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiTabs size="s">{renderTabs()}</EuiTabs>
        <EuiSpacer size="m" />
        {isLoadingChartData && <EuiLoadingChart size="l" />}
        {!isLoadingChartData && selectedTabId === TAB_IDS.CHART && (
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
                  <EditQueryDelay datafeedConfig={datafeedConfig} />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <Chart size={CHART_SIZE}>
                <Settings showLegend showLegendExtra legendPosition={Position.Bottom} />
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
                    defaultMessage: 'Record count',
                  })}
                  position={Position.Left}
                />
                <LineSeries
                  id={i18n.translate('xpack.ml.jobsList.datafeedModal.sourceSeriesId', {
                    defaultMessage: 'Source doc count by bucket span',
                  })}
                  xScaleType={ScaleType.Time}
                  yScaleType={ScaleType.Linear}
                  xAccessor={0}
                  yAccessors={[1]}
                  data={sourceData}
                  curve={CurveType.LINEAR}
                />
                <LineSeries
                  id={i18n.translate('xpack.ml.jobsList.datafeedModal.bucketSeriesId', {
                    defaultMessage: 'Doc count per bucket',
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
          </EuiFlexGroup>
        )}
        {!isLoadingChartData && selectedTabId === TAB_IDS.MESSAGES && (
          <JobMessagesPane jobId={jobId} />
        )}
      </EuiModalBody>
    </EuiModal>
  );
};
