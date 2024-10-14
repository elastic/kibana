/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EventTypeOpts } from '@kbn/core/server';
import type {
  ResponseActionAgentType,
  ResponseActionStatus,
  ResponseActionsApiCommandNames,
} from '../../../../common/endpoint/service/response_actions/constants';
import type { BulkUpsertAssetCriticalityRecordsResponse } from '../../../../common/api/entity_analytics';

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
  result?: BulkUpsertAssetCriticalityRecordsResponse['stats'];
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

export const ALERT_SUPPRESSION_EVENT: EventTypeOpts<{
  suppressionAlertsCreated: number;
  suppressionAlertsSuppressed: number;
  suppressionRuleName: string;
  suppressionDuration: number;
  suppressionGroupByFieldsNumber: number;
  suppressionGroupByFields: string[];
  suppressionRuleType: string;
  suppressionMissingFields: boolean;
  suppressionRuleId: string;
}> = {
  eventType: 'alert_suppression_on_rule_execution',
  schema: {
    suppressionAlertsCreated: {
      type: 'long',
      _meta: {
        description:
          'Number of alerts created during rule execution with configured alert suppression',
      },
    },
    suppressionAlertsSuppressed: {
      type: 'long',
      _meta: {
        description:
          'Number of alerts suppressed during rule execution with configured alert suppression',
      },
    },
    suppressionRuleName: {
      type: 'keyword',
      _meta: {
        description: 'Name of rule',
      },
    },
    suppressionDuration: {
      type: 'long',
      _meta: {
        description: 'Duration in seconds of suppression period. -1 for per rule execution config',
      },
    },
    suppressionGroupByFieldsNumber: {
      type: 'long',
      _meta: {
        description: 'Number of Suppress by fields',
      },
    },
    suppressionGroupByFields: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description: 'Tag attached to the element...',
          optional: false,
        },
      },
      _meta: {
        description: 'List of tags attached to the element...',
        optional: false,
      },
    },
    suppressionRuleType: {
      type: 'keyword',
      _meta: {
        description: 'Rule type',
      },
    },
    suppressionMissingFields: {
      type: 'boolean',
      _meta: {
        description: 'Suppression of missing fields enabled',
      },
    },
    suppressionRuleId: {
      type: 'keyword',
      _meta: {
        description: 'ruleId',
      },
    },
  },
};

interface CreateAssetCriticalityProcessedFileEvent {
  result?: BulkUpsertAssetCriticalityRecordsResponse['stats'];
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

const getUploadStatus = (stats?: BulkUpsertAssetCriticalityRecordsResponse['stats']) => {
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

export const ENDPOINT_RESPONSE_ACTION_SENT_ERROR_EVENT: EventTypeOpts<{
  responseActions: {
    agentType: ResponseActionAgentType;
    command: ResponseActionsApiCommandNames;
    error: string;
  };
}> = {
  eventType: 'endpoint_response_action_sent_error',
  schema: {
    responseActions: {
      properties: {
        agentType: {
          type: 'keyword',
          _meta: {
            description: 'The type of agent that the action was sent to',
            optional: false,
          },
        },
        command: {
          type: 'keyword',
          _meta: {
            description: 'The command that was sent to the endpoint',
            optional: false,
          },
        },
        error: {
          type: 'text',
          _meta: {
            description: 'The error message for the response action',
          },
        },
      },
    },
  },
};

export const ENDPOINT_RESPONSE_ACTION_SENT_EVENT: EventTypeOpts<{
  responseActions: {
    actionId: string;
    agentType: ResponseActionAgentType;
    command: ResponseActionsApiCommandNames;
    isAutomated: boolean;
  };
}> = {
  eventType: 'endpoint_response_action_sent',
  schema: {
    responseActions: {
      properties: {
        actionId: {
          type: 'keyword',
          _meta: {
            description: 'The ID of the action that was sent to the endpoint',
            optional: false,
          },
        },
        agentType: {
          type: 'keyword',
          _meta: {
            description: 'The type of agent that the action was sent to',
            optional: false,
          },
        },
        command: {
          type: 'keyword',
          _meta: {
            description: 'The command that was sent to the endpoint',
            optional: false,
          },
        },
        isAutomated: {
          type: 'boolean',
          _meta: {
            description: 'Whether the action was auto-initiated by a pre-configured rule',
            optional: false,
          },
        },
      },
    },
  },
};

export const ENDPOINT_RESPONSE_ACTION_STATUS_CHANGE_EVENT: EventTypeOpts<{
  responseActions: {
    actionId: string;
    agentType: ResponseActionAgentType;
    actionStatus: ResponseActionStatus;
    command: ResponseActionsApiCommandNames;
  };
}> = {
  eventType: 'endpoint_response_action_status_change_event',
  schema: {
    responseActions: {
      properties: {
        actionId: {
          type: 'keyword',
          _meta: {
            description: 'The ID of the action that was sent to the endpoint',
            optional: false,
          },
        },
        agentType: {
          type: 'keyword',
          _meta: {
            description: 'The type of agent that the action was sent to',
            optional: false,
          },
        },
        actionStatus: {
          type: 'keyword',
          _meta: {
            description: 'The status of the action',
            optional: false,
          },
        },
        command: {
          type: 'keyword',
          _meta: {
            description: 'The command that was sent to the endpoint',
            optional: false,
          },
        },
      },
    },
  },
};

export const events = [
  RISK_SCORE_EXECUTION_SUCCESS_EVENT,
  RISK_SCORE_EXECUTION_ERROR_EVENT,
  RISK_SCORE_EXECUTION_CANCELLATION_EVENT,
  ASSET_CRITICALITY_SYSTEM_PROCESSED_ASSIGNMENT_FILE_EVENT,
  ALERT_SUPPRESSION_EVENT,
  ENDPOINT_RESPONSE_ACTION_SENT_EVENT,
  ENDPOINT_RESPONSE_ACTION_SENT_ERROR_EVENT,
  ENDPOINT_RESPONSE_ACTION_STATUS_CHANGE_EVENT,
];
