/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Event type definitions
export enum TelemetryEventType {
  UploadIntegrationZipComplete = 'upload_integration_zip_complete',
  IntegrationAutoImportOpen = 'integration_auto_import_open',
  IntegrationAutoImportStepComplete = 'integration_auto_import_step_complete',
  IntegrationAutoImportGenerationComplete = 'integration_auto_import_generation_complete',
  IntegrationAutoImportComplete = 'integration_auto_import_complete',
}

// Event data definitions

interface UploadIntegrationZipCompleteData {
  integrationName?: string;
  errorMessage?: string;
}

interface IntegrationAutoImportOpenData {
  sessionId: string;
}

interface IntegrationAutoImportStepCompleteData {
  sessionId: string;
  step: number;
  stepName: string;
  durationMs: number; // Time spent in the current step
  sessionElapsedTime: number; // Total time spent in the current generation session
}

interface IntegrationAutoImportGenerationCompleteData {
  sessionId: string;
  sampleRows: number;
  durationMs: number;
  actionTypeId: string;
  model: string;
  provider: string;
  errorMessage?: string;
}

interface IntegrationAutoImportCompleteData {
  sessionId: string;
  durationMs: number;
  integrationName: string;
  integrationDescription: string;
  dataStreamName: string;
  inputTypes: string[];
  actionTypeId: string;
  model: string;
  provider: string;
  errorMessage?: string;
}

/**
 * TelemetryEventTypeData
 * Defines the relation between event types and their corresponding event data
 * */
export type TelemetryEventTypeData<T extends TelemetryEventType> =
  T extends TelemetryEventType.UploadIntegrationZipComplete
    ? UploadIntegrationZipCompleteData
    : T extends TelemetryEventType.IntegrationAutoImportOpen
    ? IntegrationAutoImportOpenData
    : T extends TelemetryEventType.IntegrationAutoImportStepComplete
    ? IntegrationAutoImportStepCompleteData
    : T extends TelemetryEventType.IntegrationAutoImportGenerationComplete
    ? IntegrationAutoImportGenerationCompleteData
    : T extends TelemetryEventType.IntegrationAutoImportComplete
    ? IntegrationAutoImportCompleteData
    : never;
