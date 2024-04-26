/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { IImporter } from '@kbn/file-upload-plugin/public';
import moment, { type Moment } from 'moment';
import { useTimeBuckets } from '@kbn/ml-time-buckets';
import { IMPORT_STATUS, type Statuses } from '../import_progress';
import { EventRateChart, type LineChartPoint } from './event_rate_chart';
import { runDocCountSearch } from './doc_count_search';
import { useDataVisualizerKibana } from '../../../kibana_context';

const BAR_TARGET = 150;
const PROGRESS_INCREMENT = 5;
const FINISHED_CHECKS = 10;
const FINISHED_CHECKS_INTERVAL_MS = 2 * 1000;
const ERROR_ATTEMPTS = 3;
const BACK_FILL_BUCKETS = 8;

export const DocCountChart: FC<{
  statuses: Statuses;
  dataStart: DataPublicPluginStart;
  importer: IImporter;
}> = ({ statuses, dataStart, importer }) => {
  const { services } = useDataVisualizerKibana();
  const { uiSettings } = services;
  const timeBuckets = useTimeBuckets(uiSettings);
  const index = useMemo(() => importer.getIndex(), [importer]);
  const timeField = useMemo(() => importer.getTimeField(), [importer]);

  const [loading, setLoading] = useState(false);
  const [loadingTimeRange, setLoadingTimeRange] = useState(false);
  const [finished, setFinished] = useState(false);
  const [previousProgress, setPreviousProgress] = useState(0);
  const [lastNonZeroTimeMs, setLastNonZeroTimeMs] = useState<
    { index: number; time: number } | undefined
  >(undefined);

  const [eventRateChartData, setEventRateChartData] = useState<LineChartPoint[]>([]);
  const [timeRange, setTimeRange] = useState<{ start: Moment; end: Moment } | undefined>(undefined);
  const [dataReady, setDataReady] = useState(false);

  const loadFullData = useRef(false);

  const [errorAttempts, setErrorAttempts] = useState(ERROR_ATTEMPTS);
  const recordFailure = useCallback(() => {
    setErrorAttempts(errorAttempts - 1);
  }, [errorAttempts]);

  const loadData = useCallback(async () => {
    if (timeField === undefined || index === undefined || timeRange === undefined) {
      return;
    }

    setLoading(true);
    timeBuckets.setInterval('auto');

    const { start, end } = timeRange;
    const fullData = loadFullData.current;

    try {
      const startMs =
        fullData === true || lastNonZeroTimeMs === undefined
          ? start.valueOf()
          : lastNonZeroTimeMs.time;
      const endMs = end.valueOf();

      if (start != null && end != null) {
        timeBuckets.setBounds({
          min: start,
          max: end,
        });
        timeBuckets.setBarTarget(BAR_TARGET);
      }

      const data = await runDocCountSearch(
        dataStart,
        index,
        timeField,
        startMs,
        endMs,
        timeBuckets
      );

      const newData =
        fullData === true
          ? data
          : [...eventRateChartData].splice(0, lastNonZeroTimeMs?.index ?? 0).concat(data);

      if (dataReady === false && newData.some((d) => d.value > 0)) {
        setDataReady(true);
      }

      setEventRateChartData(newData);
      setLastNonZeroTimeMs(findLastTimestamp(newData, BACK_FILL_BUCKETS));
    } catch (error) {
      recordFailure();
    }
    setLoading(false);
  }, [
    timeField,
    index,
    timeRange,
    timeBuckets,
    lastNonZeroTimeMs,
    dataStart,
    dataReady,
    eventRateChartData,
    recordFailure,
  ]);

  const finishedChecks = useCallback(
    async (counter: number) => {
      loadData();
      if (counter !== 0) {
        setTimeout(() => {
          finishedChecks(counter - 1);
        }, FINISHED_CHECKS_INTERVAL_MS);
      }
    },
    [loadData]
  );

  const loadTimeRange = useCallback(async () => {
    if (loadingTimeRange === true) {
      return;
    }
    setLoadingTimeRange(true);
    try {
      const { start, end } = await importer.previewIndexTimeRange();
      if (start === null || end === null || start >= end) {
        throw new Error('Invalid time range');
      }
      setTimeRange({ start: moment(start), end: moment(end) });
    } catch (error) {
      recordFailure();
    }
    setLoadingTimeRange(false);
  }, [importer, loadingTimeRange, recordFailure]);

  useEffect(
    function loadProgress() {
      if (errorAttempts === 0) {
        return;
      }

      if (timeRange === undefined) {
        loadTimeRange();
        return;
      }

      if (loading === false && statuses.uploadProgress > 1 && statuses.uploadProgress < 100) {
        if (statuses.uploadProgress - previousProgress > PROGRESS_INCREMENT) {
          setPreviousProgress(statuses.uploadProgress);

          loadData();
        }
      } else if (loading === false && statuses.uploadProgress === 100 && finished === false) {
        setFinished(true);
        finishedChecks(FINISHED_CHECKS);
        loadFullData.current = true;
      }
    },
    [
      finished,
      finishedChecks,
      loadData,
      loadTimeRange,
      loading,
      loadingTimeRange,
      previousProgress,
      statuses,
      timeRange,
      errorAttempts,
    ]
  );

  if (
    timeField === undefined ||
    statuses.indexCreatedStatus === IMPORT_STATUS.INCOMPLETE ||
    statuses.ingestPipelineCreatedStatus === IMPORT_STATUS.INCOMPLETE ||
    errorAttempts === 0 ||
    eventRateChartData.length === 0 ||
    dataReady === false
  ) {
    return null;
  }

  return (
    <>
      <EventRateChart eventRateChartData={eventRateChartData} height={'150px'} width={'100%'} />
    </>
  );
};

/**
 * Finds the last non-zero data point in the chart data
 * backFillOffset can be set to jump back a number of buckets from the final non-zero bucket.
 * This means the next time we load data, refresh the last n buckets of data in case there are new documents.
 * @param data LineChartPoint[]
 * @param backFillOffset number
 * @returns
 */
function findLastTimestamp(data: LineChartPoint[], backFillOffset = 0) {
  let lastNonZeroDataPoint = data[0].time;
  let index = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i].value > 0) {
      const backTrackIndex = i - backFillOffset >= 0 ? i - backFillOffset : i;
      lastNonZeroDataPoint = data[backTrackIndex].time;
      index = backTrackIndex;
    } else {
      break;
    }
  }
  return { index, time: lastNonZeroDataPoint as number };
}
