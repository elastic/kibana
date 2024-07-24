/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useRef, type PropsWithChildren } from 'react';
import { v4 as uuidV4 } from 'uuid';
import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/public/common';
import { TelemetryEventType } from '../../services/telemetry/types';
import { useKibana } from '../../common/hooks/use_kibana';
import type {
  AIConnector,
  ConfiguredAIConnectorType,
  IntegrationSettings,
} from './create_integration_assistant/types';

const stepNames: Record<string, string> = {
  '1': 'Connector Step',
  '2': 'Integration Step',
  '3': 'DataStream Step',
  '4': 'Review Step',
  '5': 'Deploy Step',
};

type ReportUploadZipIntegrationComplete = (params: {
  integrationName?: string;
  error?: string;
}) => void;
type ReportAssistantOpen = () => void;
type ReportAssistantStepComplete = (params: { step: number }) => void;
type ReportGenerationComplete = (params: {
  connector: AIConnector;
  integrationSettings: IntegrationSettings;
  durationMs: number;
  error?: string;
}) => void;
type ReportAssistantComplete = (params: {
  integrationName: string;
  integrationSettings: IntegrationSettings;
  connector: AIConnector;
  error?: string;
}) => void;

interface TelemetryContextProps {
  reportUploadZipIntegrationComplete: ReportUploadZipIntegrationComplete;
  reportAssistantOpen: ReportAssistantOpen;
  reportAssistantStepComplete: ReportAssistantStepComplete;
  reportGenerationComplete: ReportGenerationComplete;
  reportAssistantComplete: ReportAssistantComplete;
}

const TelemetryContext = React.createContext<TelemetryContextProps | null>(null);
export const useTelemetry = () => {
  const context = React.useContext(TelemetryContext);
  if (!context) {
    throw new Error('useTelemetry must be used within a TelemetryContextProvider');
  }
  return context;
};

export const TelemetryContextProvider = React.memo<PropsWithChildren<{}>>(({ children }) => {
  const sessionData = useRef({ sessionId: uuidV4(), startedAt: Date.now() });
  const stepsData = useRef({ startedAt: Date.now() });

  const { telemetry } = useKibana().services;

  const reportUploadZipIntegrationComplete = useCallback<ReportUploadZipIntegrationComplete>(
    ({ integrationName, error }) => {
      telemetry.reportEvent(TelemetryEventType.UploadIntegrationZipComplete, {
        integrationName,
        errorMessage: error,
      });
    },
    [telemetry]
  );

  const reportAssistantOpen = useCallback<ReportAssistantOpen>(() => {
    const sessionId = uuidV4();
    sessionData.current = { sessionId, startedAt: Date.now() };
    stepsData.current = { startedAt: Date.now() };
    telemetry.reportEvent(TelemetryEventType.IntegrationAssistantOpen, {
      sessionId,
    });
  }, [telemetry]);

  const reportAssistantStepComplete = useCallback<ReportAssistantStepComplete>(
    ({ step }) => {
      telemetry.reportEvent(TelemetryEventType.IntegrationAssistantStepComplete, {
        sessionId: sessionData.current.sessionId,
        step,
        stepName: stepNames[step.toString()] ?? 'Unknown Step',
        durationMs: Date.now() - stepsData.current.startedAt,
        sessionElapsedTime: Date.now() - sessionData.current.startedAt,
      });
      stepsData.current = { startedAt: Date.now() };
    },
    [telemetry]
  );

  const reportGenerationComplete = useCallback<ReportGenerationComplete>(
    ({ connector, integrationSettings, durationMs, error }) => {
      telemetry.reportEvent(TelemetryEventType.IntegrationAssistantGenerationComplete, {
        sessionId: sessionData.current.sessionId,
        sampleRows: integrationSettings?.logsSampleParsed?.length ?? 0,
        actionTypeId: connector.actionTypeId,
        model: getConnectorModel(connector),
        provider: connector.apiProvider ?? 'unknown',
        durationMs,
        errorMessage: error,
      });
    },
    [telemetry]
  );

  const reportAssistantComplete = useCallback<ReportAssistantComplete>(
    ({ integrationName, integrationSettings, connector, error }) => {
      telemetry.reportEvent(TelemetryEventType.IntegrationAssistantComplete, {
        sessionId: sessionData.current.sessionId,
        integrationName,
        integrationDescription: integrationSettings?.description ?? 'unknown',
        dataStreamName: integrationSettings?.dataStreamName ?? 'unknown',
        inputTypes: integrationSettings?.inputTypes ?? ['unknown'],
        actionTypeId: connector.actionTypeId,
        model: getConnectorModel(connector),
        provider: connector.apiProvider ?? 'unknown',
        durationMs: Date.now() - sessionData.current.startedAt,
        errorMessage: error,
      });
    },
    [telemetry]
  );

  const value = useMemo<TelemetryContextProps>(
    () => ({
      reportUploadZipIntegrationComplete,
      reportAssistantOpen,
      reportAssistantStepComplete,
      reportGenerationComplete,
      reportAssistantComplete,
    }),
    [
      reportUploadZipIntegrationComplete,
      reportAssistantOpen,
      reportAssistantStepComplete,
      reportGenerationComplete,
      reportAssistantComplete,
    ]
  );
  return <TelemetryContext.Provider value={value}>{children}</TelemetryContext.Provider>;
});
TelemetryContextProvider.displayName = 'TelemetryContextProvider';

const getConnectorModel = (connector: AIConnector): string => {
  let model: string = 'unknown';
  if (!connector.isPreconfigured) {
    const { apiUrl, defaultModel } = (connector as ConfiguredAIConnectorType).config ?? {};
    if (connector.apiProvider === OpenAiProviderType.AzureAi) {
      model = getAzureModelFromParameter(apiUrl ?? '') ?? 'unknown';
    } else {
      model = defaultModel ?? 'unknown';
    }
  }
  return model;
};

const getAzureModelFromParameter = (url: string): string | undefined => {
  const urlSearchParams = new URLSearchParams(new URL(url).search);
  if (urlSearchParams.get('api-version')) {
    return `OpenAI version ${urlSearchParams.get('api-version')}`;
  }
  return undefined;
};
