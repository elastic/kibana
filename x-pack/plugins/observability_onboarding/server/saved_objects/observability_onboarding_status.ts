/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsType } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';

export const OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE =
  'observability-onboarding-state';
export interface LogFilesState {
  datasetName: string;
  serviceName?: string;
  customConfigurations?: string;
  logFilePaths: string[];
  namespace: string;
}

export interface SystemLogsState {
  namespace: string;
}

export interface ElasticAgentStepPayload {
  agentId: string;
}

export type ObservabilityOnboardingType = 'logFiles' | 'systemLogs';

type ObservabilityOnboardingFlowState =
  | LogFilesState
  | SystemLogsState
  | undefined;

export interface ObservabilityOnboardingFlow {
  type: ObservabilityOnboardingType;
  state: ObservabilityOnboardingFlowState;
  progress: Record<
    string,
    {
      status: string;
      message?: string;
      payload?: ElasticAgentStepPayload;
    }
  >;
}

export interface SavedObservabilityOnboardingFlow
  extends ObservabilityOnboardingFlow {
  id: string;
  updatedAt: number;
}

const LogFilesStateSchema = schema.object({
  datasetName: schema.string(),
  serviceName: schema.maybe(schema.string()),
  customConfigurations: schema.maybe(schema.string()),
  logFilePaths: schema.arrayOf(schema.string()),
  namespace: schema.string(),
});

const SystemLogsStateSchema = schema.object({
  namespace: schema.string(),
});

const ElasticAgentStepPayloadSchema = schema.object({
  agentId: schema.string(),
});

export const observabilityOnboardingFlow: SavedObjectsType = {
  name: OBSERVABILITY_ONBOARDING_STATE_SAVED_OBJECT_TYPE,
  hidden: false,
  namespaceType: 'agnostic',
  mappings: {
    properties: {
      type: { type: 'keyword' },
      state: { type: 'object', dynamic: false },
      progress: { type: 'object', dynamic: false },
    },
  },
  modelVersions: {
    '1': {
      changes: [],
      schemas: {
        create: schema.object({
          type: schema.string(),
          state: schema.maybe(
            schema.oneOf([LogFilesStateSchema, SystemLogsStateSchema])
          ),
          progress: schema.mapOf(
            schema.string(),
            schema.object({
              status: schema.string(),
              message: schema.maybe(schema.string()),
              payload: schema.maybe(ElasticAgentStepPayloadSchema),
            })
          ),
        }),
      },
    },
  },
};
