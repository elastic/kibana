/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { TestProvider } from '../../../mocks/test_provider';
import { CreateIntegrationAssistant } from './create_integration_assistant';
import type { State } from './state';
import { ExperimentalFeaturesService } from '../../../services';

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

const mockIsConnectorStepReady = jest.fn();
const mockIsIntegrationStepReady = jest.fn();
const mockIsDataStreamStepReady = jest.fn();
const mockIsReviewStepReady = jest.fn();
const mockIsCelInputStepReady = jest.fn();
const mockIsCelReviewStepReady = jest.fn();

jest.mock('./steps/connector_step', () => ({
  ConnectorStep: () => mockConnectorStep(),
  isConnectorStepReady: () => mockIsConnectorStepReady(),
}));
jest.mock('./steps/integration_step', () => ({
  IntegrationStep: () => mockIntegrationStep(),
  isIntegrationStepReady: () => mockIsIntegrationStepReady(),
}));
jest.mock('./steps/data_stream_step', () => ({
  DataStreamStep: () => mockDataStreamStep(),
  isDataStreamStepReady: () => mockIsDataStreamStepReady(),
}));
jest.mock('./steps/review_step', () => ({
  ReviewStep: () => mockReviewStep(),
  isReviewStepReady: () => mockIsReviewStepReady(),
}));
jest.mock('./steps/cel_input_step', () => ({
  CelInputStep: () => mockCelInputStep(),
  isCelInputStepReady: () => mockIsCelInputStepReady(),
}));
jest.mock('./steps/review_cel_step', () => ({
  ReviewCelStep: () => mockReviewCelStep(),
  isCelReviewStepReady: () => mockIsCelReviewStepReady(),
}));
jest.mock('./steps/deploy_step', () => ({ DeployStep: () => mockDeployStep() }));

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

    it('should render connector', () => {
      const result = renderIntegrationAssistant();
      expect(result.queryByTestId('connectorStepMock')).toBeInTheDocument();
    });

    it('should call isConnectorStepReady', () => {
      renderIntegrationAssistant();
      expect(mockIsConnectorStepReady).toHaveBeenCalled();
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

    it('should call isIntegrationStepReady', () => {
      renderIntegrationAssistant();
      expect(mockIsIntegrationStepReady).toHaveBeenCalled();
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

    it('should call isDataStreamStepReady', () => {
      renderIntegrationAssistant();
      expect(mockIsDataStreamStepReady).toHaveBeenCalled();
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

    it('should call isReviewStepReady', () => {
      renderIntegrationAssistant();
      expect(mockIsReviewStepReady).toHaveBeenCalled();
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

    it('should call isCelInputStepReady', () => {
      renderIntegrationAssistant();
      expect(mockIsCelInputStepReady).toHaveBeenCalled();
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

    it('should call isReviewCelStepReady', () => {
      renderIntegrationAssistant();
      expect(mockIsCelReviewStepReady).toHaveBeenCalled();
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
