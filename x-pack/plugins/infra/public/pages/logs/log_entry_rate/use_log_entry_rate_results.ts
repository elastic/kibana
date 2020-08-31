/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo, useState } from 'react';

import {
  GetLogEntryRateSuccessResponsePayload,
  LogEntryRateHistogramBucket,
  LogEntryRatePartition,
  LogEntryRateAnomaly,
} from '../../../../common/http_api/log_analysis';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import { callGetLogEntryRateAPI } from './service_calls/get_log_entry_rate';

type PartitionBucket = LogEntryRatePartition & {
  startTime: number;
};

type PartitionRecord = Record<
  string,
  { buckets: PartitionBucket[]; topAnomalyScore: number; totalNumberOfLogEntries: number }
>;

export type AnomalyRecord = LogEntryRateAnomaly & {
  partitionId: string;
};

export interface LogEntryRateResults {
  bucketDuration: number;
  totalNumberOfLogEntries: number;
  histogramBuckets: LogEntryRateHistogramBucket[];
  partitionBuckets: PartitionRecord;
  anomalies: AnomalyRecord[];
}

export const useLogEntryRateResults = ({
  sourceId,
  startTime,
  endTime,
  bucketDuration = 15 * 60 * 1000,
  filteredDatasets,
}: {
  sourceId: string;
  startTime: number;
  endTime: number;
  bucketDuration: number;
  filteredDatasets?: string[];
}) => {
  const [logEntryRate, setLogEntryRate] = useState<LogEntryRateResults | null>(null);

  const [getLogEntryRateRequest, getLogEntryRate] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async () => {
        return await callGetLogEntryRateAPI(
          sourceId,
          startTime,
          endTime,
          bucketDuration,
          filteredDatasets
        );
      },
      onResolve: ({ data }) => {
        setLogEntryRate({
          bucketDuration: data.bucketDuration,
          totalNumberOfLogEntries: data.totalNumberOfLogEntries,
          histogramBuckets: data.histogramBuckets,
          partitionBuckets: formatLogEntryRateResultsByPartition(data),
          anomalies: formatLogEntryRateResultsByAllAnomalies(data),
        });
      },
      onReject: () => {
        setLogEntryRate(null);
      },
    },
    [sourceId, startTime, endTime, bucketDuration, filteredDatasets]
  );

  const isLoading = useMemo(() => getLogEntryRateRequest.state === 'pending', [
    getLogEntryRateRequest.state,
  ]);

  return {
    getLogEntryRate,
    isLoading,
    logEntryRate,
  };
};

const formatLogEntryRateResultsByPartition = (
  results: GetLogEntryRateSuccessResponsePayload['data']
): PartitionRecord => {
  const partitionedBuckets = results.histogramBuckets.reduce<
    Record<string, { buckets: PartitionBucket[] }>
  >((partitionResults, bucket) => {
    return bucket.partitions.reduce<Record<string, { buckets: PartitionBucket[] }>>(
      (_partitionResults, partition) => {
        return {
          ..._partitionResults,
          [partition.partitionId]: {
            buckets: _partitionResults[partition.partitionId]
              ? [
                  ..._partitionResults[partition.partitionId].buckets,
                  { startTime: bucket.startTime, ...partition },
                ]
              : [{ startTime: bucket.startTime, ...partition }],
          },
        };
      },
      partitionResults
    );
  }, {});

  const resultsByPartition: PartitionRecord = {};

  Object.entries(partitionedBuckets).map(([key, value]) => {
    const anomalyScores = value.buckets.reduce((scores: number[], bucket) => {
      return [...scores, bucket.maximumAnomalyScore];
    }, []);
    const totalNumberOfLogEntries = value.buckets.reduce((total, bucket) => {
      return (total += bucket.numberOfLogEntries);
    }, 0);
    resultsByPartition[key] = {
      topAnomalyScore: Math.max(...anomalyScores),
      totalNumberOfLogEntries,
      buckets: value.buckets,
    };
  });

  return resultsByPartition;
};

const formatLogEntryRateResultsByAllAnomalies = (
  results: GetLogEntryRateSuccessResponsePayload['data']
): AnomalyRecord[] => {
  return results.histogramBuckets.reduce<AnomalyRecord[]>((anomalies, bucket) => {
    return bucket.partitions.reduce<AnomalyRecord[]>((_anomalies, partition) => {
      if (partition.anomalies.length > 0) {
        partition.anomalies.forEach((anomaly) => {
          _anomalies.push({
            partitionId: partition.partitionId,
            ...anomaly,
          });
        });
        return _anomalies;
      } else {
        return _anomalies;
      }
    }, anomalies);
  }, []);
};
