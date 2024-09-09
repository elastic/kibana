/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, act, type RenderResult, waitFor } from '@testing-library/react';
import { mockReportEvent } from '../../../../../services/telemetry/mocks/service';
import { TestProvider } from '../../../../../mocks/test_provider';
import { GenerationModal } from './generation_modal';
import { ActionsProvider } from '../../state';
import { mockActions, mockState } from '../../mocks/state';
import { TelemetryEventType } from '../../../../../services/telemetry/types';

const integrationSettings = mockState.integrationSettings!;
const connector = mockState.connector!;

const mockAnalyzeLogsResults = {
  parsedSamples: [{ test: 'analyzeLogsResponse' }],
  sampleLogsFormat: { name: 'json' },
};
const mockEcsMappingResults = { pipeline: { test: 'ecsMappingResponse' }, docs: [] };
const mockCategorizationResults = { pipeline: { test: 'categorizationResponse' }, docs: [] };
const mockRelatedResults = { pipeline: { test: 'relatedResponse' }, docs: [] };
const mockRunAnalyzeLogsGraph = jest.fn((_: unknown) => ({ results: mockAnalyzeLogsResults }));
const mockRunEcsGraph = jest.fn((_: unknown) => ({ results: mockEcsMappingResults }));
const mockRunCategorizationGraph = jest.fn((_: unknown) => ({
  results: mockCategorizationResults,
}));
const mockRunRelatedGraph = jest.fn((_: unknown) => ({ results: mockRelatedResults }));

const defaultRequest = {
  connectorId: connector.id,
  LangSmithOptions: undefined,
};

jest.mock('../../../../../common/lib/api', () => ({
  runAnalyzeLogsGraph: (params: unknown) => mockRunAnalyzeLogsGraph(params),
  runEcsGraph: (params: unknown) => mockRunEcsGraph(params),
  runCategorizationGraph: (params: unknown) => mockRunCategorizationGraph(params),
  runRelatedGraph: (params: unknown) => mockRunRelatedGraph(params),
}));

const mockOnComplete = jest.fn();
const mockOnClose = jest.fn();

const wrapper: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <TestProvider>
    <ActionsProvider value={mockActions}>{children}</ActionsProvider>
  </TestProvider>
);

describe('GenerationModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when there are no errors', () => {
    let result: RenderResult;
    beforeEach(async () => {
      await act(async () => {
        result = render(
          <GenerationModal
            integrationSettings={integrationSettings}
            connector={connector}
            onComplete={mockOnComplete}
            onClose={mockOnClose}
          />,
          { wrapper }
        );
        await waitFor(() => expect(mockOnComplete).toBeCalled());
      });
    });

    it('should render generation modal', () => {
      expect(result.queryByTestId('generationModal')).toBeInTheDocument();
    });

    it('should call runAnalyzeLogsGraph with correct parameters', () => {
      expect(mockRunAnalyzeLogsGraph).toHaveBeenCalledWith({
        ...defaultRequest,
        logSamples: integrationSettings.logSamples ?? [],
      });
    });

    it('should call runEcsGraph with correct parameters', () => {
      expect(mockRunEcsGraph).toHaveBeenCalledWith({
        ...defaultRequest,
        rawSamples: mockAnalyzeLogsResults.parsedSamples,
        packageName: integrationSettings.name ?? '',
        dataStreamName: integrationSettings.dataStreamName ?? '',
      });
    });

    it('should call runCategorizationGraph with correct parameters', () => {
      expect(mockRunCategorizationGraph).toHaveBeenCalledWith({
        ...defaultRequest,
        currentPipeline: mockEcsMappingResults.pipeline,
        rawSamples: mockAnalyzeLogsResults.parsedSamples,
        packageName: integrationSettings.name ?? '',
        dataStreamName: integrationSettings.dataStreamName ?? '',
      });
    });

    it('should call runRelatedGraph with correct parameters', () => {
      expect(mockRunRelatedGraph).toHaveBeenCalledWith({
        ...defaultRequest,
        currentPipeline: mockCategorizationResults.pipeline,
        rawSamples: mockAnalyzeLogsResults.parsedSamples,
        packageName: integrationSettings.name ?? '',
        dataStreamName: integrationSettings.dataStreamName ?? '',
      });
    });

    it('should call onComplete with the results', () => {
      expect(mockOnComplete).toHaveBeenCalledWith(mockRelatedResults);
    });

    it('should report telemetry for generation complete', () => {
      expect(mockReportEvent).toHaveBeenCalledWith(
        TelemetryEventType.IntegrationAssistantGenerationComplete,
        {
          sessionId: expect.any(String),
          sampleRows: integrationSettings.logSamples?.length ?? 0,
          actionTypeId: connector.actionTypeId,
          model: expect.anything(),
          provider: connector.apiProvider ?? 'unknown',
          durationMs: expect.any(Number),
          errorMessage: undefined,
        }
      );
    });
  });

  describe('when there are errors', () => {
    const errorMessage = 'error message';
    let result: RenderResult;
    beforeEach(async () => {
      mockRunEcsGraph.mockImplementationOnce(() => {
        throw new Error(errorMessage);
      });

      await act(async () => {
        result = render(
          <GenerationModal
            integrationSettings={integrationSettings}
            connector={connector}
            onComplete={mockOnComplete}
            onClose={mockOnClose}
          />,
          { wrapper }
        );
        await waitFor(() =>
          expect(result.queryByTestId('generationErrorCallout')).toBeInTheDocument()
        );
      });
    });

    it('should show the error text', () => {
      expect(result.queryByText(errorMessage)).toBeInTheDocument();
    });
    it('should render the retry button', () => {
      expect(result.queryByTestId('retryButton')).toBeInTheDocument();
    });
    it('should report telemetry for generation error', () => {
      expect(mockReportEvent).toHaveBeenCalledWith(
        TelemetryEventType.IntegrationAssistantGenerationComplete,
        {
          sessionId: expect.any(String),
          sampleRows: integrationSettings.logSamples?.length ?? 0,
          actionTypeId: connector.actionTypeId,
          model: expect.anything(),
          provider: connector.apiProvider ?? 'unknown',
          durationMs: expect.any(Number),
          errorMessage,
        }
      );
    });

    describe('when the retrying successfully', () => {
      beforeEach(async () => {
        await act(async () => {
          result.getByTestId('retryButton').click();
          await waitFor(() => expect(mockOnComplete).toBeCalled());
        });
      });

      it('should not render the error callout', () => {
        expect(result.queryByTestId('generationErrorCallout')).not.toBeInTheDocument();
      });
      it('should not render the retry button', () => {
        expect(result.queryByTestId('retryButton')).not.toBeInTheDocument();
      });
    });
  });
});
