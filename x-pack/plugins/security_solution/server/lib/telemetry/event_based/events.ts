/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EventTypeOpts } from '@kbn/analytics-client';
import type { AssetCriticalityCsvUploadResponse } from '../../../../common/api/entity_analytics';

export const RISK_SCORE_EXECUTION_SUCCESS_EVENT: EventTypeOpts<{
  scoresWritten: number;
  taskDurationInSeconds: number;
  interval: string;
  alertSampleSizePerShard: number;
}> = {
  eventType: 'risk_score_execution_success',
  schema: {
    scoresWritten: {
      type: 'long',
      _meta: {
        description: 'Number of risk scores written during this scoring task execution',
      },
    },
    taskDurationInSeconds: {
      type: 'long',
      _meta: {
        description: 'Duration (in seconds) of the current risk scoring task execution',
      },
    },
    interval: {
      type: 'keyword',
      _meta: {
        description: `Configured interval for the current risk scoring task`,
      },
    },
    alertSampleSizePerShard: {
      type: 'long',
      _meta: {
        description: `Number of alerts to sample per shard for the current risk scoring task`,
      },
    },
  },
};

export const RISK_SCORE_EXECUTION_ERROR_EVENT: EventTypeOpts<{}> = {
  eventType: 'risk_score_execution_error',
  schema: {},
};

export const RISK_SCORE_EXECUTION_CANCELLATION_EVENT: EventTypeOpts<{
  scoresWritten: number;
  taskDurationInSeconds: number;
  interval: string;
  alertSampleSizePerShard: number;
}> = {
  eventType: 'risk_score_execution_cancellation',
  schema: {
    scoresWritten: {
      type: 'long',
      _meta: {
        description: 'Number of risk scores written during this scoring task execution',
      },
    },
    taskDurationInSeconds: {
      type: 'long',
      _meta: {
        description: 'Duration (in seconds) of the current risk scoring task execution',
      },
    },
    interval: {
      type: 'keyword',
      _meta: {
        description: `Configured interval for the current risk scoring task`,
      },
    },
    alertSampleSizePerShard: {
      type: 'long',
      _meta: {
        description: `Number of alerts to sample per shard for the current risk scoring task`,
      },
    },
  },
};

interface AssetCriticalitySystemProcessedAssignmentFileEvent {
  processing: {
    startTime: string;
    endTime: string;
    tookMs: number;
  };
  result?: AssetCriticalityCsvUploadResponse['stats'];
  status: 'success' | 'partial_success' | 'fail';
}

export const ASSET_CRITICALITY_SYSTEM_PROCESSED_ASSIGNMENT_FILE_EVENT: EventTypeOpts<AssetCriticalitySystemProcessedAssignmentFileEvent> =
  {
    eventType: 'Asset Criticality Csv Upload Processed',
    schema: {
      processing: {
        properties: {
          startTime: { type: 'date', _meta: { description: 'Processing start time' } },
          endTime: { type: 'date', _meta: { description: 'Processing end time' } },
          tookMs: { type: 'long', _meta: { description: 'How long processing took ms' } },
        },
      },
      result: {
        properties: {
          successful: {
            type: 'long',
            _meta: { description: 'Number of criticality records successfully created or updated' },
          },
          failed: {
            type: 'long',
            _meta: { description: 'Number of criticality records which had errors' },
          },
          total: { type: 'long', _meta: { description: 'Total number of lines in the file' } },
        },
      },
      status: {
        type: 'keyword',
        _meta: { description: 'Status of the processing either success, partial_success or fail' },
      },
    },
  };

interface CreateAssetCriticalityProcessedFileEvent {
  result?: AssetCriticalityCsvUploadResponse['stats'];
  startTime: Date;
  endTime: Date;
}
export const createAssetCriticalityProcessedFileEvent = ({
  result,
  startTime,
  endTime,
}: CreateAssetCriticalityProcessedFileEvent): [
  string,
  AssetCriticalitySystemProcessedAssignmentFileEvent
] => {
  const status = getUploadStatus(result);

  const processing = {
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    tookMs: endTime.getTime() - startTime.getTime(),
  };

  return [
    ASSET_CRITICALITY_SYSTEM_PROCESSED_ASSIGNMENT_FILE_EVENT.eventType,
    {
      processing,
      result,
      status,
    },
  ];
};

const getUploadStatus = (stats?: AssetCriticalityCsvUploadResponse['stats']) => {
  if (!stats) {
    return 'fail';
  }

  if (stats.failed === 0) {
    return 'success';
  }

  if (stats.successful > 0) {
    return 'partial_success';
  }

  return 'fail';
};

export const events = [
  RISK_SCORE_EXECUTION_SUCCESS_EVENT,
  RISK_SCORE_EXECUTION_ERROR_EVENT,
  RISK_SCORE_EXECUTION_CANCELLATION_EVENT,
  ASSET_CRITICALITY_SYSTEM_PROCESSED_ASSIGNMENT_FILE_EVENT,
];
