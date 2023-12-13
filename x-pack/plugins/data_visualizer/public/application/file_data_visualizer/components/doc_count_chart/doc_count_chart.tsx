/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { FileUploadPluginStart } from '@kbn/file-upload-plugin/public';
// import dateMath from '@kbn/datemath';
import React, { FC, useEffect, useState, useCallback, useMemo } from 'react';
import { lastValueFrom } from 'rxjs';
import moment, { Moment } from 'moment';
import { useTimeBuckets } from '../../../common/hooks/use_time_buckets';
import { IMPORT_STATUS, Statuses } from '../import_progress';
import { EventRateChart, LineChartPoint } from './event_rate_chart';

const BAR_TARGET = 150;
const PROGRESS_INCREMENT = 5;
const FINISHED_CHECKS = 5;
const ATTEMPTS = 3;

export const DocCountChart: FC<{
  statuses: Statuses;
  dataStart: DataPublicPluginStart;
  index: string;
  mappingsString: string;
  pipelineString: string;
  fileUpload: FileUploadPluginStart;
  firstReadDoc: any;
  lastReadDoc: any;
}> = ({
  statuses,
  dataStart,
  index,
  mappingsString,
  pipelineString,
  fileUpload,
  firstReadDoc,
  lastReadDoc,
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
  const recordFailure = useCallback(() => {
    // eslint-disable-next-line no-console
    console.log('incrementFailedAttempts');
    setTimeRangeAttempts(timeRangeAttempts - 1);
  }, [timeRangeAttempts]);

  // const [finishedChecksCountDown, setFinishedChecksCountDown] = useState(FINISHED_CHECKS);

  const timeFieldName: string | undefined = useMemo(() => {
    // console.log('mappingsString', mappingsString);

    const mappings = JSON.parse(mappingsString);
    const fields = Object.entries<{ type: string }>(mappings.properties);
    const dateFields = fields.filter(
      ([name, field]) => field.type === 'date' || field.type === 'date_nanos'
    );
    if (dateFields.length === 0) {
      return;
    }

    const timeField = dateFields.find(([name, field]) => name === '@timestamp') ?? dateFields[0];
    return timeField[0];
  }, [mappingsString]);

  const loadData = useCallback(async () => {
    if (timeFieldName === undefined || timeRange === undefined) {
      return;
    }

    setLoading(true);
    timeBuckets.setInterval('auto');

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
      const startMs = start.tz('UTC-1').valueOf();
      const endMs = end.tz('UTC-1').valueOf();

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
                    field: timeFieldName,
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
        const dd: LineChartPoint[] = resp.rawResponse.aggregations.eventRate.buckets.map((b) => ({
          time: b.key,
          value: b.doc_count,
        }));
        // console.log('dd', dd);

        setEventRateChartData(dd);
      }
    } catch (error) {
      // console.log('error', error);
      setLoading(false);
      recordFailure();
    }

    // console.log('resp', resp);
  }, [dataStart.search, recordFailure, index, timeBuckets, timeFieldName, timeRange]);

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
    if (timeFieldName === undefined || firstReadDoc === undefined || lastReadDoc === undefined) {
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
        timeFieldName
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
        fileUpload.getTimeFromDoc(timeFieldName, firstReadDoc1, pipeline),
        fileUpload.getTimeFromDoc(timeFieldName, lastReadDoc1, pipeline),
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
  }, [fileUpload, firstReadDoc, recordFailure, index, lastReadDoc, pipelineString, timeFieldName]);

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
    timeFieldName === undefined ||
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
