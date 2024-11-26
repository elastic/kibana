/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, act } from '@testing-library/react';
import { TestProvider } from '../../../mocks/test_provider';
import { CreateIntegrationAssistant } from './create_integration_assistant';
import type { State } from './state';
import { ExperimentalFeaturesService } from '../../../services';
import { mockReportEvent } from '../../../services/telemetry/mocks/service';
import { TelemetryEventType } from '../../../services/telemetry/types';

export const defaultInitialState: State = {
  step: 1,
  connector: undefined,
  integrationSettings: undefined,
  isGenerating: false,
  hasCelInput: false,
  result: undefined,
};

const mockInitialState = jest.fn((): State => defaultInitialState);
jest.mock('./state', () => ({
  ...jest.requireActual('./state'),
  get initialState() {
    return mockInitialState();
  },
}));

jest.mock('../../../services');
const mockedExperimentalFeaturesService = jest.mocked(ExperimentalFeaturesService);

const mockConnectorStep = jest.fn(() => <div data-test-subj="connectorStepMock" />);
const mockIntegrationStep = jest.fn(() => <div data-test-subj="integrationStepMock" />);
const mockDataStreamStep = jest.fn(() => <div data-test-subj="dataStreamStepMock" />);
const mockReviewStep = jest.fn(() => <div data-test-subj="reviewStepMock" />);
const mockCelInputStep = jest.fn(() => <div data-test-subj="celInputStepMock" />);
const mockReviewCelStep = jest.fn(() => <div data-test-subj="reviewCelStepMock" />);
const mockDeployStep = jest.fn(() => <div data-test-subj="deployStepMock" />);

const mockIsConnectorStepReadyToComplete = jest.fn();
const mockIsIntegrationStepReadyToComplete = jest.fn();
const mockIsDataStreamStepReadyToComplete = jest.fn();
const mockIsReviewStepReadyToComplete = jest.fn();
const mockIsCelInputStepReadyToComplete = jest.fn();
const mockIsCelReviewStepReadyToComplete = jest.fn();

jest.mock('./steps/connector_step', () => ({
  ConnectorStep: () => mockConnectorStep(),
  isConnectorStepReadyToComplete: () => mockIsConnectorStepReadyToComplete(),
}));
jest.mock('./steps/integration_step', () => ({
  IntegrationStep: () => mockIntegrationStep(),
  isIntegrationStepReadyToComplete: () => mockIsIntegrationStepReadyToComplete(),
}));
jest.mock('./steps/data_stream_step', () => ({
  DataStreamStep: () => mockDataStreamStep(),
  isDataStreamStepReadyToComplete: () => mockIsDataStreamStepReadyToComplete(),
}));
jest.mock('./steps/review_step', () => ({
  ReviewStep: () => mockReviewStep(),
  isReviewStepReadyToComplete: () => mockIsReviewStepReadyToComplete(),
}));
jest.mock('./steps/cel_input_step', () => ({
  CelInputStep: () => mockCelInputStep(),
  isCelInputStepReadyToComplete: () => mockIsCelInputStepReadyToComplete(),
}));
jest.mock('./steps/review_cel_step', () => ({
  ReviewCelStep: () => mockReviewCelStep(),
  isCelReviewStepReadyToComplete: () => mockIsCelReviewStepReadyToComplete(),
}));
jest.mock('./steps/deploy_step', () => ({ DeployStep: () => mockDeployStep() }));

const mockNavigate = jest.fn();
jest.mock('../../../common/hooks/use_navigate', () => ({
  ...jest.requireActual('../../../common/hooks/use_navigate'),
  useNavigate: () => mockNavigate,
}));

const renderIntegrationAssistant = () =>
  render(<CreateIntegrationAssistant />, { wrapper: TestProvider });

describe('CreateIntegration', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedExperimentalFeaturesService.get.mockReturnValue({
      generateCel: false,
    } as never);
  });

  describe('when step is 1', () => {
    beforeEach(() => {
      mockInitialState.mockReturnValueOnce({ ...defaultInitialState, step: 1 });
    });

    it('shoud report telemetry for assistant open', () => {
      renderIntegrationAssistant();
      expect(mockReportEvent).toHaveBeenCalledWith(TelemetryEventType.IntegrationAssistantOpen, {
        sessionId: expect.any(String),
      });
    });

    it('should render connector step', () => {
      const result = renderIntegrationAssistant();
      expect(result.queryByTestId('connectorStepMock')).toBeInTheDocument();
    });

    it('should call isConnectorStepReadyToComplete', () => {
      renderIntegrationAssistant();
      expect(mockIsConnectorStepReadyToComplete).toHaveBeenCalled();
    });

    it('should show "Next" on the next button', () => {
      const result = renderIntegrationAssistant();
      expect(result.getByTestId('buttonsFooter-nextButton')).toHaveTextContent('Next');
    });

    describe('when connector step is not done', () => {
      beforeEach(() => {
        mockIsConnectorStepReadyToComplete.mockReturnValue(false);
      });

      it('should disable the next button', () => {
        const result = renderIntegrationAssistant();
        expect(result.getByTestId('buttonsFooter-nextButton')).toBeDisabled();
      });

      it('should still enable the back button', () => {
        const result = renderIntegrationAssistant();
        expect(result.getByTestId('buttonsFooter-backButton')).toBeEnabled();
      });

      it('should still enable the cancel button', () => {
        const result = renderIntegrationAssistant();
        expect(result.getByTestId('buttonsFooter-cancelButton')).toBeEnabled();
      });
    });

    describe('when connector step is done', () => {
      beforeEach(() => {
        mockIsConnectorStepReadyToComplete.mockReturnValue(true);
      });

      it('should enable the next button', () => {
        const result = renderIntegrationAssistant();
        expect(result.getByTestId('buttonsFooter-nextButton')).toBeEnabled();
      });

      it('should enable the back button', () => {
        const result = renderIntegrationAssistant();
        expect(result.getByTestId('buttonsFooter-backButton')).toBeEnabled();
      });

      it('should enable the cancel button', () => {
        const result = renderIntegrationAssistant();
        expect(result.getByTestId('buttonsFooter-cancelButton')).toBeEnabled();
      });

      describe('when next button is clicked', () => {
        beforeEach(() => {
          const result = renderIntegrationAssistant();
          mockReportEvent.mockClear();
          act(() => {
            result.getByTestId('buttonsFooter-nextButton').click();
          });
        });

        it('should report telemetry for connector step completion', () => {
          expect(mockReportEvent).toHaveBeenCalledWith(
            TelemetryEventType.IntegrationAssistantStepComplete,
            {
              sessionId: expect.any(String),
              step: 1,
              stepName: 'Connector Step',
              durationMs: expect.any(Number),
              sessionElapsedTime: expect.any(Number),
            }
          );
        });
      });
    });

    describe('when back button is clicked', () => {
      let result: ReturnType<typeof renderIntegrationAssistant>;
      beforeEach(() => {
        result = renderIntegrationAssistant();
        mockReportEvent.mockClear();
        act(() => {
          result.getByTestId('buttonsFooter-backButton').click();
        });
      });

      it('should not report telemetry', () => {
        expect(mockReportEvent).not.toHaveBeenCalled();
      });

      it('should navigate to the landing page', () => {
        expect(mockNavigate).toHaveBeenCalledWith('landing');
      });
    });
  });

  describe('when step is 2', () => {
    beforeEach(() => {
      mockIsConnectorStepReadyToComplete.mockReturnValue(true);
      mockInitialState.mockReturnValueOnce({ ...defaultInitialState, step: 2 });
    });

    it('should render integration', () => {
      const result = renderIntegrationAssistant();
      expect(result.queryByTestId('integrationStepMock')).toBeInTheDocument();
    });

    it('should call isIntegrationStepReadyToComplete', () => {
      renderIntegrationAssistant();
      expect(mockIsIntegrationStepReadyToComplete).toHaveBeenCalled();
    });

    it('should show "Next" on the next button', () => {
      const result = renderIntegrationAssistant();
      expect(result.getByTestId('buttonsFooter-nextButton')).toHaveTextContent('Next');
    });

    describe('when integration step is not done', () => {
      beforeEach(() => {
        mockIsIntegrationStepReadyToComplete.mockReturnValue(false);
      });

      it('should disable the next button', () => {
        const result = renderIntegrationAssistant();
        expect(result.getByTestId('buttonsFooter-nextButton')).toBeDisabled();
      });

      it('should still enable the back button', () => {
        const result = renderIntegrationAssistant();
        expect(result.getByTestId('buttonsFooter-backButton')).toBeEnabled();
      });

      it('should still enable the cancel button', () => {
        const result = renderIntegrationAssistant();
        expect(result.getByTestId('buttonsFooter-cancelButton')).toBeEnabled();
      });
    });

    describe('when integration step is done', () => {
      beforeEach(() => {
        mockIsIntegrationStepReadyToComplete.mockReturnValue(true);
      });

      it('should enable the next button', () => {
        const result = renderIntegrationAssistant();
        expect(result.getByTestId('buttonsFooter-nextButton')).toBeEnabled();
      });

      it('should enable the back button', () => {
        const result = renderIntegrationAssistant();
        expect(result.getByTestId('buttonsFooter-backButton')).toBeEnabled();
      });

      it('should enable the cancel button', () => {
        const result = renderIntegrationAssistant();
        expect(result.getByTestId('buttonsFooter-cancelButton')).toBeEnabled();
      });

      describe('when next button is clicked', () => {
        beforeEach(() => {
          const result = renderIntegrationAssistant();
          mockReportEvent.mockClear();
          act(() => {
            result.getByTestId('buttonsFooter-nextButton').click();
          });
        });

        it('should report telemetry for integration step completion', () => {
          expect(mockReportEvent).toHaveBeenCalledWith(
            TelemetryEventType.IntegrationAssistantStepComplete,
            {
              sessionId: expect.any(String),
              step: 2,
              stepName: 'Integration Step',
              durationMs: expect.any(Number),
              sessionElapsedTime: expect.any(Number),
            }
          );
        });
      });
    });

    describe('when back button is clicked', () => {
      let result: ReturnType<typeof renderIntegrationAssistant>;
      beforeEach(() => {
        result = renderIntegrationAssistant();
        mockReportEvent.mockClear();
        act(() => {
          result.getByTestId('buttonsFooter-backButton').click();
        });
      });

      it('should not report telemetry', () => {
        expect(mockReportEvent).not.toHaveBeenCalled();
      });

      it('should show connector step', () => {
        expect(result.queryByTestId('connectorStepMock')).toBeInTheDocument();
      });

      it('should enable the next button', () => {
        expect(result.getByTestId('buttonsFooter-nextButton')).toBeEnabled();
      });
    });
  });

  describe('when step is 3', () => {
    beforeEach(() => {
      mockIsConnectorStepReadyToComplete.mockReturnValue(true);
      mockIsIntegrationStepReadyToComplete.mockReturnValue(true);
      mockInitialState.mockReturnValueOnce({ ...defaultInitialState, step: 3 });
    });

    it('should render data stream', () => {
      const result = renderIntegrationAssistant();
      expect(result.queryByTestId('dataStreamStepMock')).toBeInTheDocument();
    });

    it('should call isDataStreamStepReadyToComplete', () => {
      renderIntegrationAssistant();
      expect(mockIsDataStreamStepReadyToComplete).toHaveBeenCalled();
    });

    it('should show "Analyze logs" on the next button', () => {
      const result = renderIntegrationAssistant();
      expect(result.getByTestId('buttonsFooter-nextButton')).toHaveTextContent('Analyze logs');
    });

    describe('when data stream step is not done', () => {
      beforeEach(() => {
        mockIsDataStreamStepReadyToComplete.mockReturnValue(false);
      });

      it('should disable the next button', () => {
        const result = renderIntegrationAssistant();
        expect(result.getByTestId('buttonsFooter-nextButton')).toBeDisabled();
      });

      it('should still enable the back button', () => {
        const result = renderIntegrationAssistant();
        expect(result.getByTestId('buttonsFooter-backButton')).toBeEnabled();
      });

      it('should still enable the cancel button', () => {
        const result = renderIntegrationAssistant();
        expect(result.getByTestId('buttonsFooter-cancelButton')).toBeEnabled();
      });
    });

    describe('when data stream step is done', () => {
      beforeEach(() => {
        mockIsDataStreamStepReadyToComplete.mockReturnValue(true);
      });

      it('should enable the next button', () => {
        const result = renderIntegrationAssistant();
        expect(result.getByTestId('buttonsFooter-nextButton')).toBeEnabled();
      });

      it('should enable the back button', () => {
        const result = renderIntegrationAssistant();
        expect(result.getByTestId('buttonsFooter-backButton')).toBeEnabled();
      });

      it('should enable the cancel button', () => {
        const result = renderIntegrationAssistant();
        expect(result.getByTestId('buttonsFooter-cancelButton')).toBeEnabled();
      });

      describe('when next button is clicked', () => {
        beforeEach(() => {
          const result = renderIntegrationAssistant();
          mockReportEvent.mockClear();
          act(() => {
            result.getByTestId('buttonsFooter-nextButton').click();
          });
        });

        it('should report telemetry for data stream step completion', () => {
          expect(mockReportEvent).toHaveBeenCalledWith(
            TelemetryEventType.IntegrationAssistantStepComplete,
            {
              sessionId: expect.any(String),
              step: 3,
              stepName: 'DataStream Step',
              durationMs: expect.any(Number),
              sessionElapsedTime: expect.any(Number),
            }
          );
        });

        it('should show loader on the next button', () => {
          const result = renderIntegrationAssistant();
          expect(result.getByTestId('generatingLoader')).toBeInTheDocument();
        });

        it('should disable the next button', () => {
          const result = renderIntegrationAssistant();
          expect(result.getByTestId('buttonsFooter-nextButton')).toBeDisabled();
        });
      });
    });

    describe('when back button is clicked', () => {
      let result: ReturnType<typeof renderIntegrationAssistant>;
      beforeEach(() => {
        result = renderIntegrationAssistant();
        mockReportEvent.mockClear();
        act(() => {
          result.getByTestId('buttonsFooter-backButton').click();
        });
      });

      it('should not report telemetry', () => {
        expect(mockReportEvent).not.toHaveBeenCalled();
      });

      it('should show integration step', () => {
        expect(result.queryByTestId('integrationStepMock')).toBeInTheDocument();
      });

      it('should enable the next button', () => {
        expect(result.getByTestId('buttonsFooter-nextButton')).toBeEnabled();
      });
    });
  });

  describe('when step is 4', () => {
    beforeEach(() => {
      mockInitialState.mockReturnValueOnce({ ...defaultInitialState, step: 4 });
    });

    it('should render review', () => {
      const result = renderIntegrationAssistant();
      expect(result.queryByTestId('reviewStepMock')).toBeInTheDocument();
    });

    it('should call isReviewStepReadyToComplete', () => {
      renderIntegrationAssistant();
      expect(mockIsReviewStepReadyToComplete).toHaveBeenCalled();
    });

    it('should show the "Add to Elastic" on the next button', () => {
      const result = renderIntegrationAssistant();
      expect(result.getByTestId('buttonsFooter-nextButton')).toHaveTextContent('Add to Elastic');
    });

    describe('when review step is not done', () => {
      beforeEach(() => {
        mockIsReviewStepReadyToComplete.mockReturnValue(false);
      });

      it('should disable the next button', () => {
        const result = renderIntegrationAssistant();
        expect(result.getByTestId('buttonsFooter-nextButton')).toBeDisabled();
      });

      it('should still enable the back button', () => {
        const result = renderIntegrationAssistant();
        expect(result.getByTestId('buttonsFooter-backButton')).toBeEnabled();
      });

      it('should still enable the cancel button', () => {
        const result = renderIntegrationAssistant();
        expect(result.getByTestId('buttonsFooter-cancelButton')).toBeEnabled();
      });
    });

    describe('when review step is done', () => {
      beforeEach(() => {
        mockIsReviewStepReadyToComplete.mockReturnValue(true);
      });

      it('should enable the next button', () => {
        const result = renderIntegrationAssistant();
        expect(result.getByTestId('buttonsFooter-nextButton')).toBeEnabled();
      });

      it('should enable the back button', () => {
        const result = renderIntegrationAssistant();
        expect(result.getByTestId('buttonsFooter-backButton')).toBeEnabled();
      });

      it('should enable the cancel button', () => {
        const result = renderIntegrationAssistant();
        expect(result.getByTestId('buttonsFooter-cancelButton')).toBeEnabled();
      });

      describe('when next button is clicked', () => {
        beforeEach(() => {
          const result = renderIntegrationAssistant();
          mockReportEvent.mockClear();
          act(() => {
            result.getByTestId('buttonsFooter-nextButton').click();
          });
        });

        it('should report telemetry for review step completion', () => {
          expect(mockReportEvent).toHaveBeenCalledWith(
            TelemetryEventType.IntegrationAssistantStepComplete,
            {
              sessionId: expect.any(String),
              step: 4,
              stepName: 'Review Step',
              durationMs: expect.any(Number),
              sessionElapsedTime: expect.any(Number),
            }
          );
        });

        it('should show deploy step', () => {
          const result = renderIntegrationAssistant();
          expect(result.queryByTestId('deployStepMock')).toBeInTheDocument();
        });

        it('should enable the next button', () => {
          const result = renderIntegrationAssistant();
          expect(result.getByTestId('buttonsFooter-nextButton')).toBeEnabled();
        });
      });
    });
  });

  describe('when step is 5', () => {
    beforeEach(() => {
      mockInitialState.mockReturnValueOnce({ ...defaultInitialState, step: 5 });
    });

    it('should render deploy', () => {
      const result = renderIntegrationAssistant();
      expect(result.queryByTestId('deployStepMock')).toBeInTheDocument();
    });

    it('should hide the back button', () => {
      const result = renderIntegrationAssistant();
      expect(result.queryByTestId('buttonsFooter-backButton')).toBe(null);
    });

    it('should hide the next button', () => {
      const result = renderIntegrationAssistant();
      expect(result.queryByTestId('buttonsFooter-backButton')).toBe(null);
    });

    it('should enable the cancel button', () => {
      const result = renderIntegrationAssistant();
      expect(result.getByTestId('buttonsFooter-cancelButton')).toBeEnabled();
    });

    it('should show "Close" on the cancel button', () => {
      const result = renderIntegrationAssistant();
      expect(result.getByTestId('buttonsFooter-cancelButton')).toHaveTextContent('Close');
    });
  });
});

describe('CreateIntegration with generateCel enabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedExperimentalFeaturesService.get.mockReturnValue({
      generateCel: true,
    } as never);
  });

  describe('when step is 5 and has celInput', () => {
    beforeEach(() => {
      mockInitialState.mockReturnValueOnce({ ...defaultInitialState, step: 5, hasCelInput: true });
    });

    it('should render cel input', () => {
      const result = renderIntegrationAssistant();
      expect(result.queryByTestId('celInputStepMock')).toBeInTheDocument();
    });

    it('should call isCelInputStepReadyToComplete', () => {
      renderIntegrationAssistant();
      expect(mockIsCelInputStepReadyToComplete).toHaveBeenCalled();
    });

    it('should show "Generate CEL input configuration" on the next button', () => {
      const result = renderIntegrationAssistant();
      expect(result.getByTestId('buttonsFooter-nextButton')).toHaveTextContent(
        'Generate CEL input configuration'
      );
    });

    it('should enable the back button', () => {
      const result = renderIntegrationAssistant();
      expect(result.getByTestId('buttonsFooter-backButton')).toBeEnabled();
    });

    describe('when cel input step is not done', () => {
      beforeEach(() => {
        mockIsCelInputStepReadyToComplete.mockReturnValue(false);
      });

      it('should disable the next button', () => {
        const result = renderIntegrationAssistant();
        expect(result.getByTestId('buttonsFooter-nextButton')).toBeDisabled();
      });
    });

    describe('when cel input step is done', () => {
      beforeEach(() => {
        mockIsCelInputStepReadyToComplete.mockReturnValue(true);
      });

      it('should enable the next button', () => {
        const result = renderIntegrationAssistant();
        expect(result.getByTestId('buttonsFooter-nextButton')).toBeEnabled();
      });

      describe('when next button is clicked', () => {
        beforeEach(() => {
          const result = renderIntegrationAssistant();
          mockReportEvent.mockClear();
          act(() => {
            result.getByTestId('buttonsFooter-nextButton').click();
          });
        });

        it('should report telemetry for cel input step completion', () => {
          expect(mockReportEvent).toHaveBeenCalledWith(
            TelemetryEventType.IntegrationAssistantStepComplete,
            {
              sessionId: expect.any(String),
              step: 5,
              stepName: 'CEL Input Step',
              durationMs: expect.any(Number),
              sessionElapsedTime: expect.any(Number),
            }
          );
        });

        it('should show loader on the next button', () => {
          const result = renderIntegrationAssistant();
          expect(result.getByTestId('generatingLoader')).toBeInTheDocument();
        });

        it('should disable the next button', () => {
          const result = renderIntegrationAssistant();
          expect(result.getByTestId('buttonsFooter-nextButton')).toBeDisabled();
        });
      });
    });

    describe('when back button is clicked', () => {
      let result: ReturnType<typeof renderIntegrationAssistant>;
      beforeEach(() => {
        result = renderIntegrationAssistant();
        mockReportEvent.mockClear();
        act(() => {
          result.getByTestId('buttonsFooter-backButton').click();
        });
      });

      it('should not report telemetry', () => {
        expect(mockReportEvent).not.toHaveBeenCalled();
      });

      it('should show review step', () => {
        expect(result.queryByTestId('reviewStepMock')).toBeInTheDocument();
      });

      it('should enable the next button', () => {
        expect(result.getByTestId('buttonsFooter-nextButton')).toBeEnabled();
      });
    });
  });

  describe('when step is 5 and does not have celInput', () => {
    beforeEach(() => {
      mockInitialState.mockReturnValueOnce({ ...defaultInitialState, step: 5 });
    });

    it('should render deploy', () => {
      const result = renderIntegrationAssistant();
      expect(result.queryByTestId('deployStepMock')).toBeInTheDocument();
    });

    it('should hide the back button', () => {
      const result = renderIntegrationAssistant();
      expect(result.queryByTestId('buttonsFooter-backButton')).toBe(null);
    });

    it('should hide the next button', () => {
      const result = renderIntegrationAssistant();
      expect(result.queryByTestId('buttonsFooter-backButton')).toBe(null);
    });

    it('should enable the cancel button', () => {
      const result = renderIntegrationAssistant();
      expect(result.getByTestId('buttonsFooter-cancelButton')).toBeEnabled();
    });

    it('should show "Close" on the cancel button', () => {
      const result = renderIntegrationAssistant();
      expect(result.getByTestId('buttonsFooter-cancelButton')).toHaveTextContent('Close');
    });
  });

  describe('when step is 6', () => {
    beforeEach(() => {
      mockInitialState.mockReturnValueOnce({
        ...defaultInitialState,
        step: 6,
        celInputResult: { program: 'program', stateSettings: {}, redactVars: [] },
      });
    });

    it('should render review', () => {
      const result = renderIntegrationAssistant();
      expect(result.queryByTestId('reviewCelStepMock')).toBeInTheDocument();
    });

    it('should call isReviewCelStepReadyToComplete', () => {
      renderIntegrationAssistant();
      expect(mockIsCelReviewStepReadyToComplete).toHaveBeenCalled();
    });

    it('should show the "Add to Elastic" on the next button', () => {
      const result = renderIntegrationAssistant();
      expect(result.getByTestId('buttonsFooter-nextButton')).toHaveTextContent('Add to Elastic');
    });

    describe('when cel review step is not done', () => {
      beforeEach(() => {
        mockIsCelReviewStepReadyToComplete.mockReturnValue(false);
      });

      it('should disable the next button', () => {
        const result = renderIntegrationAssistant();
        expect(result.getByTestId('buttonsFooter-nextButton')).toBeDisabled();
      });

      it('should still enable the back button', () => {
        const result = renderIntegrationAssistant();
        expect(result.getByTestId('buttonsFooter-backButton')).toBeEnabled();
      });

      it('should still enable the cancel button', () => {
        const result = renderIntegrationAssistant();
        expect(result.getByTestId('buttonsFooter-cancelButton')).toBeEnabled();
      });
    });

    describe('when cel review step is done', () => {
      beforeEach(() => {
        mockIsCelReviewStepReadyToComplete.mockReturnValue(true);
      });

      it('should enable the next button', () => {
        const result = renderIntegrationAssistant();
        expect(result.getByTestId('buttonsFooter-nextButton')).toBeEnabled();
      });

      it('should enable the back button', () => {
        const result = renderIntegrationAssistant();
        expect(result.getByTestId('buttonsFooter-backButton')).toBeEnabled();
      });

      it('should enable the cancel button', () => {
        const result = renderIntegrationAssistant();
        expect(result.getByTestId('buttonsFooter-cancelButton')).toBeEnabled();
      });

      describe('when next button is clicked', () => {
        beforeEach(() => {
          const result = renderIntegrationAssistant();
          mockReportEvent.mockClear();
          act(() => {
            result.getByTestId('buttonsFooter-nextButton').click();
          });
        });

        it('should report telemetry for review step completion', () => {
          expect(mockReportEvent).toHaveBeenCalledWith(
            TelemetryEventType.IntegrationAssistantStepComplete,
            {
              sessionId: expect.any(String),
              step: 6,
              stepName: 'CEL Review Step',
              durationMs: expect.any(Number),
              sessionElapsedTime: expect.any(Number),
            }
          );
        });

        it('should show deploy step', () => {
          const result = renderIntegrationAssistant();
          expect(result.queryByTestId('deployStepMock')).toBeInTheDocument();
        });

        it('should enable the next button', () => {
          const result = renderIntegrationAssistant();
          expect(result.getByTestId('buttonsFooter-nextButton')).toBeEnabled();
        });
      });
    });
  });

  describe('when step is 7', () => {
    beforeEach(() => {
      mockInitialState.mockReturnValueOnce({ ...defaultInitialState, step: 7 });
    });

    it('should render deploy', () => {
      const result = renderIntegrationAssistant();
      expect(result.queryByTestId('deployStepMock')).toBeInTheDocument();
    });

    it('should hide the back button', () => {
      const result = renderIntegrationAssistant();
      expect(result.queryByTestId('buttonsFooter-backButton')).toBe(null);
    });

    it('should hide the next button', () => {
      const result = renderIntegrationAssistant();
      expect(result.queryByTestId('buttonsFooter-backButton')).toBe(null);
    });

    it('should enable the cancel button', () => {
      const result = renderIntegrationAssistant();
      expect(result.getByTestId('buttonsFooter-cancelButton')).toBeEnabled();
    });

    it('should show "Close" on the cancel button', () => {
      const result = renderIntegrationAssistant();
      expect(result.getByTestId('buttonsFooter-cancelButton')).toHaveTextContent('Close');
    });
  });
});
