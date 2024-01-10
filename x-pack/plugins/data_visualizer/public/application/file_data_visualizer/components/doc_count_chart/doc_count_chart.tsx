/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { IImporter } from '@kbn/file-upload-plugin/public';
import React, { FC, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { lastValueFrom } from 'rxjs';
import moment, { Moment } from 'moment';
import { useTimeBuckets } from '../../../common/hooks/use_time_buckets';
import { IMPORT_STATUS, Statuses } from '../import_progress';
import { EventRateChart, LineChartPoint } from './event_rate_chart';

const BAR_TARGET = 150;
const PROGRESS_INCREMENT = 5;
const FINISHED_CHECKS = 3;
const ATTEMPTS = 3;
const BACK_FILL_BUCKETS = 8;

export const DocCountChart: FC<{
  statuses: Statuses;
  dataStart: DataPublicPluginStart;
  importer: IImporter;
}> = ({ statuses, dataStart, importer }) => {
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const [previousProgress, setPreviousProgress] = useState(0);
  const [eventRateChartData, setEventRateChartData] = useState<LineChartPoint[]>([]);
  const timeBuckets = useTimeBuckets();
  const [timeRange, setTimeRange] = useState<{ start: Moment; end: Moment } | undefined>(undefined);
  const [timeRangeAttempts, setTimeRangeAttempts] = useState(ATTEMPTS);
  const [lastNonZeroTimeMs, setLastNonZeroTimeMs] = useState<
    { index: number; time: number } | undefined
  >(undefined);
  const loadFullData = useRef(false);
  const recordFailure = useCallback(() => {
    // eslint-disable-next-line no-console
    console.log('incrementFailedAttempts');
    setTimeRangeAttempts(timeRangeAttempts - 1);
  }, [timeRangeAttempts]);
  const index = useMemo(() => importer.getIndex(), [importer]);
  const timeField = useMemo(() => importer.getTimeField(), [importer]);

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

      const intervalMs = timeBuckets.getInterval().asMilliseconds();

      const resp = await lastValueFrom(
        dataStart.search.search({
          params: {
            index,
            body: {
              size: 0,
              query: {
                bool: {
                  must: [
                    {
                      range: {
                        [timeField]: {
                          gte: startMs,
                          lte: endMs,
                          format: 'epoch_millis',
                        },
                      },
                    },
                    {
                      match_all: {},
                    },
                  ],
                },
              },
              aggs: {
                eventRate: {
                  date_histogram: {
                    field: timeField,
                    fixed_interval: `${intervalMs}ms`,
                    min_doc_count: 0,
                    extended_bounds: {
                      min: startMs,
                      max: endMs,
                    },
                  },
                },
              },
            },
          },
        })
      );
      setLoading(false);
      // @ts-expect-error
      if (resp?.rawResponse?.aggregations?.eventRate?.buckets !== undefined) {
        // @ts-expect-error
        const data: LineChartPoint[] = resp.rawResponse.aggregations.eventRate.buckets.map((b) => ({
          time: b.key,
          value: b.doc_count,
        }));

        // eslint-disable-next-line no-console
        console.log('data', data);

        const newData =
          fullData === true
            ? data
            : [...eventRateChartData].splice(0, lastNonZeroTimeMs?.index ?? 0).concat(data);

        setEventRateChartData(newData);
        setLastNonZeroTimeMs(findLastTimestamp(newData, BACK_FILL_BUCKETS));
      }
    } catch (error) {
      setLoading(false);
      recordFailure();
    }
  }, [
    timeField,
    index,
    timeRange,
    timeBuckets,
    lastNonZeroTimeMs,
    dataStart.search,
    eventRateChartData,
    recordFailure,
  ]);

  const finishedChecks = useCallback(
    async (counter: number) => {
      // eslint-disable-next-line no-console
      console.log('finishedChecks', counter);

      loadData();
      if (counter !== 0) {
        setTimeout(() => {
          finishedChecks(counter - 1);
        }, 2 * 1000);
      }
    },
    [loadData]
  );

  const loadTimeRange = useCallback(async () => {
    if (timeField === undefined) {
      return;
    }
    try {
      const { start, end } = await importer.previewIndexTimeRange();
      if (start >= end) {
        throw new Error('Invalid time range');
      }
      setTimeRange({ start: moment(start), end: moment(end) });
    } catch (error) {
      recordFailure();
    }
  }, [importer, recordFailure, timeField]);

  useEffect(() => {
    if (timeRangeAttempts === 0) {
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
  }, [
    finished,
    finishedChecks,
    loadData,
    loadTimeRange,
    loading,
    previousProgress,
    statuses,
    timeRange,
    timeRangeAttempts,
  ]);

  if (
    timeField === undefined ||
    statuses.indexCreatedStatus === IMPORT_STATUS.INCOMPLETE ||
    statuses.ingestPipelineCreatedStatus === IMPORT_STATUS.INCOMPLETE ||
    timeRangeAttempts === 0 ||
    eventRateChartData.length === 0
  ) {
    return null;
  }

  return (
    <>
      <EventRateChart
        eventRateChartData={eventRateChartData}
        height={'150px'}
        width={'100%'}
        showAxis={true}
      />
    </>
  );
};

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
