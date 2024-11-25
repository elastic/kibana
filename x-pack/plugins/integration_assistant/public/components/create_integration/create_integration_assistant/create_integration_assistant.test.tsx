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

const mockIsConnectorStepCompleted = jest.fn();
const mockIsIntegrationStepCompleted = jest.fn();
const mockIsDataStreamStepCompleted = jest.fn();
const mockIsReviewStepCompleted = jest.fn();
const mockIsCelInputStepCompleted = jest.fn();
const mockIsCelReviewStepCompleted = jest.fn();

jest.mock('./steps/connector_step', () => ({
  ConnectorStep: () => mockConnectorStep(),
  isConnectorStepCompleted: () => mockIsConnectorStepCompleted(),
}));
jest.mock('./steps/integration_step', () => ({
  IntegrationStep: () => mockIntegrationStep(),
  isIntegrationStepCompleted: () => mockIsIntegrationStepCompleted(),
}));
jest.mock('./steps/data_stream_step', () => ({
  DataStreamStep: () => mockDataStreamStep(),
  isDataStreamStepCompleted: () => mockIsDataStreamStepCompleted(),
}));
jest.mock('./steps/review_step', () => ({
  ReviewStep: () => mockReviewStep(),
  isReviewStepCompleted: () => mockIsReviewStepCompleted(),
}));
jest.mock('./steps/cel_input_step', () => ({
  CelInputStep: () => mockCelInputStep(),
  isCelInputStepCompleted: () => mockIsCelInputStepCompleted(),
}));
jest.mock('./steps/review_cel_step', () => ({
  ReviewCelStep: () => mockReviewCelStep(),
  isCelReviewStepCompleted: () => mockIsCelReviewStepCompleted(),
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

    it('should render connector step', () => {
      const result = renderIntegrationAssistant();
      expect(result.queryByTestId('connectorStepMock')).toBeInTheDocument();
    });

    it('should call isConnectorStepCompleted', () => {
      renderIntegrationAssistant();
      expect(mockIsConnectorStepCompleted).toHaveBeenCalled();
    });

    describe('when connector step is not done', () => {
      beforeEach(() => {
        mockIsConnectorStepCompleted.mockReturnValue(false);
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
        mockIsConnectorStepCompleted.mockReturnValue(true);
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
      beforeEach(() => {
        const result = renderIntegrationAssistant();
        mockReportEvent.mockClear();
        act(() => {
          result.getByTestId('buttonsFooter-backButton').click();
        });
      });

      it('should not report telemetry', () => {
        expect(mockReportEvent).not.toHaveBeenCalled();
      });

      it('should return to landing page', () => {
        expect(mockNavigate).toHaveBeenCalledWith('landing');
      });
    });
  });

  describe('when step is 2', () => {
    beforeEach(() => {
      mockInitialState.mockReturnValueOnce({ ...defaultInitialState, step: 2 });
    });

    it('should render integration', () => {
      const result = renderIntegrationAssistant();
      expect(result.queryByTestId('integrationStepMock')).toBeInTheDocument();
    });

    it('should call isIntegrationStepCompleted', () => {
      renderIntegrationAssistant();
      expect(mockIsIntegrationStepCompleted).toHaveBeenCalled();
    });
  });

  describe('when step is 3', () => {
    beforeEach(() => {
      mockInitialState.mockReturnValueOnce({ ...defaultInitialState, step: 3 });
    });

    it('should render data stream', () => {
      const result = renderIntegrationAssistant();
      expect(result.queryByTestId('dataStreamStepMock')).toBeInTheDocument();
    });

    it('should call isDataStreamStepCompleted', () => {
      renderIntegrationAssistant();
      expect(mockIsDataStreamStepCompleted).toHaveBeenCalled();
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

    it('should call isReviewStepCompleted', () => {
      renderIntegrationAssistant();
      expect(mockIsReviewStepCompleted).toHaveBeenCalled();
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

    it('should call isCelInputStepCompleted', () => {
      renderIntegrationAssistant();
      expect(mockIsCelInputStepCompleted).toHaveBeenCalled();
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

    it('should call isReviewCelStepCompleted', () => {
      renderIntegrationAssistant();
      expect(mockIsCelReviewStepCompleted).toHaveBeenCalled();
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
  });
});
