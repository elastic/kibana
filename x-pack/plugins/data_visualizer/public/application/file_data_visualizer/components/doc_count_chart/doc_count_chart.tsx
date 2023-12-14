/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { FileUploadPluginStart } from '@kbn/file-upload-plugin/public';
// import dateMath from '@kbn/datemath';
import React, { FC, useEffect, useState, useCallback, useRef } from 'react';
import { lastValueFrom } from 'rxjs';
import moment, { Moment } from 'moment';
import { useTimeBuckets } from '../../../common/hooks/use_time_buckets';
import { IMPORT_STATUS, Statuses } from '../import_progress';
import { EventRateChart, LineChartPoint } from './event_rate_chart';

const BAR_TARGET = 150;
const PROGRESS_INCREMENT = 5;
const FINISHED_CHECKS = 3;
const ATTEMPTS = 3;

export const DocCountChart: FC<{
  statuses: Statuses;
  dataStart: DataPublicPluginStart;
  index: string;
  pipelineString: string;
  fileUpload: FileUploadPluginStart;
  firstReadDoc: any;
  lastReadDoc: any;
  timeField: string | undefined;
}> = ({
  statuses,
  dataStart,
  index,
  pipelineString,
  fileUpload,
  firstReadDoc,
  lastReadDoc,
  timeField,
}) => {
  // console.log('statuses', statuses);
  // console.log('dataStart', dataStart);
  // const [timeFieldName, setTimeFieldName] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const [previousProgress, setPreviousProgress] = useState(0);
  // const [previousDocCount, setPreviousDocCount] = useState(0);
  const [eventRateChartData, setEventRateChartData] = useState<LineChartPoint[]>([]);
  const timeBuckets = useTimeBuckets();
  // const [previousPredictedEnd, setPreviousPredictedEnd] = useState<Moment>(moment(0));
  // const [actualEnd, setActualEnd] = useState<Moment | undefined>(undefined);
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

  // const [finishedChecksCountDown, setFinishedChecksCountDown] = useState(FINISHED_CHECKS);

  // const timeField: string | undefined = useMemo(() => {
  //   // console.log('mappingsString', mappingsString);

  //   const mappings = JSON.parse(mappingsString);
  //   const dateFields = Object.entries<{ type: string }>(mappings.properties).filter(
  //     ([, field]) => field.type === 'date' || field.type === 'date_nanos'
  //   );
  //   if (dateFields.length === 0) {
  //     return;
  //   }

  //   const timeFields = dateFields.find(([name]) => name === timeFieldName) ?? dateFields[0];
  //   return timeFields[0];
  // }, [mappingsString, timeFieldName]);

  const loadData = useCallback(async () => {
    if (timeField === undefined || timeRange === undefined) {
      return;
    }

    setLoading(true);
    timeBuckets.setInterval('auto');

    // console.log(lastNonZeroTimeMs);

    const { start, end } = timeRange;
    // const { start, end } = await fileUpload.getTimeFieldRange(
    //   index,
    //   {
    //     bool: {
    //       must: [
    //         {
    //           match_all: {},
    //         },
    //       ],
    //     },
    //   },
    //   timeFieldName
    // );

    // let predictedEnd;
    // let predictedEndMs;

    // if (actualEnd === undefined) {
    //   const timeDiff = end.epoch - start.epoch;

    //   predictedEnd = moment(start.epoch + Math.round(timeDiff / (progress / 100)));

    //   if (progress === 100) {
    //     predictedEnd = moment(end.epoch);
    //     setPreviousPredictedEnd(predictedEnd);
    //   } else {
    //     predictedEndMs = predictedEnd.valueOf();
    //     const previousPredictedEndMs = previousPredictedEnd.valueOf();
    //     if (predictedEndMs > previousPredictedEndMs) {
    //       // console.log('setting new previousPredictedEnd', predictedEnd);
    //       setPreviousPredictedEnd(predictedEnd);
    //     } else {
    //       predictedEnd = previousPredictedEnd;
    //     }
    //   }
    // } else {
    //   predictedEnd = actualEnd;
    //   predictedEndMs = predictedEnd.valueOf();
    // }

    // const predictedEndMs = predictedEnd.valueOf();

    // console.log('newEndMs', predictedEndMs);
    // if (progress === 100) {
    //   console.log('real end', end);
    // }

    // console.log(end.epoch, newEndMs);

    try {
      const startMs =
        loadFullData.current === true || lastNonZeroTimeMs === undefined
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
      // console.log('intervalMs', intervalMs);

      // console.log('loadData');

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
                        '@timestamp': {
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

        const newData = [...eventRateChartData]
          .splice(0, lastNonZeroTimeMs?.index ?? 0)
          .concat(data);

        setEventRateChartData(newData);
        setLastNonZeroTimeMs(findLastTimestamp(newData));
      }
    } catch (error) {
      setLoading(false);
      recordFailure();
    }
  }, [
    timeField,
    timeRange,
    timeBuckets,
    lastNonZeroTimeMs,
    dataStart.search,
    index,
    eventRateChartData,
    recordFailure,
  ]);

  const finishedChecks = useCallback(
    async (counter: number) => {
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
    if (timeField === undefined || firstReadDoc === undefined || lastReadDoc === undefined) {
      return;
    }
    const pipeline = JSON.parse(pipelineString);

    let realStart;
    try {
      const { start } = await fileUpload.getTimeFieldRange(
        index,
        {
          bool: {
            must: [
              {
                match_all: {},
              },
            ],
          },
        },
        timeField
      );
      realStart = start;
    } catch (error) {
      // console.log('error', error);
      return;
    }

    if (realStart && realStart.epoch === null) {
      return;
    }

    try {
      const firstReadDoc1 =
        typeof firstReadDoc === 'string' ? JSON.parse(firstReadDoc) : firstReadDoc;
      const lastReadDoc1 = typeof lastReadDoc === 'string' ? JSON.parse(lastReadDoc) : lastReadDoc;

      const [firstDocTime, lastDocTime] = await Promise.all([
        fileUpload.getTimeFromDoc(timeField, firstReadDoc1, pipeline),
        fileUpload.getTimeFromDoc(timeField, lastReadDoc1, pipeline),
      ]);

      const startMs = realStart.epoch;
      const diffMs = lastDocTime.time.epoch - firstDocTime.time.epoch;
      const endMs = startMs + diffMs;

      if (startMs > endMs) {
        throw new Error('startMs > endMs');
      }

      setTimeRange({ start: moment(startMs), end: moment(endMs) });
    } catch (error) {
      // console.log('loadTimeRange', error);
      recordFailure();
    }
  }, [fileUpload, firstReadDoc, recordFailure, index, lastReadDoc, pipelineString, timeField]);

  useEffect(() => {
    // console.log(statuses);
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

function findLastTimestamp(data: LineChartPoint[]) {
  let lastNonZeroDataPoint = data[data.length - 1].time;
  let index = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i].value > 0) {
      lastNonZeroDataPoint = data[i].time;
      index = i;
    }
  }
  return { index, time: lastNonZeroDataPoint as number };
}
