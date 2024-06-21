/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Event type definitions
export enum TelemetryEventType {
  AssistantProcessStart = 'assistant_process_start',
  AssistantProcessSuccess = 'assistant_process_success',
  AssistantStepFinish = 'assistant_step_finish',
  //   AssistantGenerationFinish = 'assistant_generation_finish',
  //   AssistantEditPipeline = 'assistant_edit_pipeline',
  //   UploadZipFile = 'upload_zip_file',
}

// Event data definitions

interface AssistantProcessStartEventData {
  processId: string;
  customerId: string;
}

interface AssistantProcessSuccessEventData {
  processId: string;
  userId: string;
}

interface AssistantStepFinishEventData {
  processId: string;
  stepId: string;
  duration: number;
  userId: string;
}

/**
 * TelemetryEventTypeData
 * Defines the relation between event types and their corresponding event data
 * */
export type TelemetryEventTypeData<T extends TelemetryEventType> =
  T extends TelemetryEventType.AssistantProcessStart
    ? AssistantProcessStartEventData
    : T extends TelemetryEventType.AssistantProcessSuccess
    ? AssistantProcessSuccessEventData
    : T extends TelemetryEventType.AssistantStepFinish
    ? AssistantStepFinishEventData
    : never;
