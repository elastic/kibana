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

export const defaultInitialState: State = {
  step: 1,
  connector: undefined,
  integrationSettings: undefined,
  isGenerating: false,
  result: undefined,
  showCelCreateFlyout: false,
  isFlyoutGenerating: false,
};
const mockInitialState = jest.fn((): State => defaultInitialState);
jest.mock('./state', () => ({
  ...jest.requireActual('./state'),
  get initialState() {
    return mockInitialState();
  },
}));

const mockConnectorStep = jest.fn(() => <div data-test-subj="connectorStepMock" />);
const mockIntegrationStep = jest.fn(() => <div data-test-subj="integrationStepMock" />);
const mockDataStreamStep = jest.fn(() => <div data-test-subj="dataStreamStepMock" />);
const mockCelCreateFlyout = jest.fn(() => <div data-test-subj="celCreateFlyoutMock" />);
const mockReviewStep = jest.fn(() => <div data-test-subj="reviewStepMock" />);
const mockDeployStep = jest.fn(() => <div data-test-subj="deployStepMock" />);

const mockIsConnectorStepReady = jest.fn();
const mockIsIntegrationStepReady = jest.fn();
const mockIsDataStreamStepReady = jest.fn();
const mockIsReviewStepReady = jest.fn();

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
jest.mock('./flyout/cel_configuration', () => ({
  CreateCelConfigFlyout: () => mockCelCreateFlyout(),
}));
jest.mock('./steps/review_step', () => ({
  ReviewStep: () => mockReviewStep(),
  isReviewStepReady: () => mockIsReviewStepReady(),
}));
jest.mock('./steps/deploy_step', () => ({ DeployStep: () => mockDeployStep() }));

const renderIntegrationAssistant = () =>
  render(<CreateIntegrationAssistant />, { wrapper: TestProvider });

describe('CreateIntegration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  describe('when step is 3 and showCelCreateFlyout=true', () => {
    beforeEach(() => {
      mockInitialState.mockReturnValueOnce({
        ...defaultInitialState,
        step: 3,
        showCelCreateFlyout: true,
      });
    });

    it('should render cel creation flyout', () => {
      const result = renderIntegrationAssistant();
      expect(result.queryByTestId('celCreateFlyoutMock')).toBeInTheDocument();
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
