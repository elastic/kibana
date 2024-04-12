/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TelemetryEvent } from '../types';
import { TelemetryEventTypes } from '../constants';
import {
  alertsGroupingChangedEvent,
  alertsGroupingTakeActionEvent,
  alertsGroupingToggledEvent,
} from './alerts_grouping';
import {
  entityAlertsClickedEvent,
  entityClickedEvent,
  entityRiskFilteredEvent,
  addRiskInputToTimelineClickedEvent,
  RiskInputsExpandedFlyoutOpenedEvent,
  toggleRiskSummaryClickedEvent,
} from './entity_analytics';
import {
  assistantInvokedEvent,
  assistantSettingToggledEvent,
  assistantMessageSentEvent,
  assistantQuickPrompt,
} from './ai_assistant';
import { insightsGeneratedEvent } from './insights';
import { dataQualityIndexCheckedEvent, dataQualityCheckAllClickedEvent } from './data_quality';
import {
  DocumentDetailsFlyoutOpenedEvent,
  DocumentDetailsTabClickedEvent,
} from './document_details';

const mlJobUpdateEvent: TelemetryEvent = {
  eventType: TelemetryEventTypes.MLJobUpdate,
  schema: {
    jobId: {
      type: 'keyword',
      _meta: {
        description: 'Job id',
        optional: false,
      },
    },
    isElasticJob: {
      type: 'boolean',
      _meta: {
        description: 'If true the job is one of the pre-configure security solution modules',
        optional: false,
      },
    },
    moduleId: {
      type: 'keyword',
      _meta: {
        description: 'Module id',
        optional: true,
      },
    },
    status: {
      type: 'keyword',
      _meta: {
        description: 'It describes what has changed in the job.',
        optional: false,
      },
    },
    errorMessage: {
      type: 'text',
      _meta: {
        description: 'Error message',
        optional: true,
      },
    },
  },
};

const cellActionClickedEvent: TelemetryEvent = {
  eventType: TelemetryEventTypes.CellActionClicked,
  schema: {
    fieldName: {
      type: 'keyword',
      _meta: {
        description: 'Field Name',
        optional: false,
      },
    },
    actionId: {
      type: 'keyword',
      _meta: {
        description: 'Action id',
        optional: false,
      },
    },
    displayName: {
      type: 'keyword',
      _meta: {
        description: 'User friendly action name',
        optional: false,
      },
    },
    metadata: {
      type: 'pass_through',
      _meta: {
        description: 'Action metadata',
        optional: true,
      },
    },
  },
};

const anomaliesCountClickedEvent: TelemetryEvent = {
  eventType: TelemetryEventTypes.AnomaliesCountClicked,
  schema: {
    jobId: {
      type: 'keyword',
      _meta: {
        description: 'Job id',
        optional: false,
      },
    },
    count: {
      type: 'integer',
      _meta: {
        description: 'Number of anomalies',
        optional: false,
      },
    },
  },
};

const breadCrumbClickedEvent: TelemetryEvent = {
  eventType: TelemetryEventTypes.BreadcrumbClicked,
  schema: {
    title: {
      type: 'keyword',
      _meta: {
        description: 'Breadcrumb title',
        optional: false,
      },
    },
  },
};

export const telemetryEvents = [
  alertsGroupingToggledEvent,
  alertsGroupingChangedEvent,
  alertsGroupingTakeActionEvent,
  assistantInvokedEvent,
  assistantMessageSentEvent,
  assistantQuickPrompt,
  assistantSettingToggledEvent,
  insightsGeneratedEvent,
  entityClickedEvent,
  entityAlertsClickedEvent,
  entityRiskFilteredEvent,
  toggleRiskSummaryClickedEvent,
  RiskInputsExpandedFlyoutOpenedEvent,
  addRiskInputToTimelineClickedEvent,
  mlJobUpdateEvent,
  cellActionClickedEvent,
  anomaliesCountClickedEvent,
  dataQualityIndexCheckedEvent,
  dataQualityCheckAllClickedEvent,
  breadCrumbClickedEvent,
  DocumentDetailsFlyoutOpenedEvent,
  DocumentDetailsTabClickedEvent,
];
