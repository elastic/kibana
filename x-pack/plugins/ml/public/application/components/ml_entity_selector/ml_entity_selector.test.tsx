/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import { MlEntitySelector } from './ml_entity_selector';
import { useMlApiContext } from '../../contexts/kibana';
import type { MlApiServices } from '../../services/ml_api_service';
import { useToastNotificationService } from '../../services/toast_notification_service';

jest.mock('../../contexts/kibana');
jest.mock('../../services/toast_notification_service');
jest.mock('../../capabilities/check_capabilities');

describe('MlEntitySelector', () => {
  const getAllJobAndGroupIds = jest.fn(() => {
    return Promise.resolve({ jobIds: ['ad_01', 'ad_02'] });
  });

  const getDataFrameAnalytics = jest.fn(() => {
    return Promise.resolve({
      count: 2,
      data_frame_analytics: [{ id: 'dfa_01' }, { id: 'dfa_02' }],
    });
  });

  const getTrainedModels = jest.fn(() => {
    return Promise.resolve([{ model_id: 'model_01' }]);
  });

  (useMlApiContext as jest.MockedFunction<typeof useMlApiContext>).mockImplementation(() => {
    return {
      jobs: {
        getAllJobAndGroupIds,
      },
      dataFrameAnalytics: {
        getDataFrameAnalytics,
      },
      trainedModels: {
        getTrainedModels,
      },
    } as unknown as jest.Mocked<MlApiServices>;
  });

  beforeEach(() => {});

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('fetches all available options on mount by default', async () => {
    const { getByTestId } = render(<MlEntitySelector />);

    await waitFor(() => {
      expect(getByTestId('mlEntitySelector_loaded')).toBeInTheDocument();
    });

    expect(getTrainedModels).toHaveBeenCalledTimes(1);
    expect(getAllJobAndGroupIds).toHaveBeenCalledTimes(1);
    expect(getDataFrameAnalytics).toHaveBeenCalledTimes(1);
  });

  test('fetches requested entity types on mount', async () => {
    const { getByTestId } = render(<MlEntitySelector entityTypes={{ anomaly_detector: true }} />);

    await waitFor(() => {
      expect(getByTestId('mlEntitySelector_loaded')).toBeInTheDocument();
    });

    expect(getTrainedModels).not.toHaveBeenCalled();
    expect(getDataFrameAnalytics).not.toHaveBeenCalled();
    expect(getAllJobAndGroupIds).toHaveBeenCalledTimes(1);
  });

  test('marks selected entities', async () => {
    const { getByTestId } = render(
      <MlEntitySelector selectedOptions={[{ id: 'ad_01', type: 'anomaly_detector' }]} />
    );

    await waitFor(() => {
      expect(getByTestId('mlEntitySelector_loaded')).toBeInTheDocument();
    });

    // Assert available options to select
    const optionsContainer = await screen.findByTestId(
      'comboBoxOptionsList mlEntitySelector_loaded-optionsList'
    );
    const optionElements = optionsContainer.querySelectorAll('[data-test-subj="mlAdJobOption"]');
    expect(optionElements).toHaveLength(1);
    expect(optionElements[0]).toHaveAttribute('id', 'anomaly_detector:ad_02');
    expect(optionsContainer.querySelectorAll('[data-test-subj="mlDfaJobOption"]')).toHaveLength(2);
    expect(
      optionsContainer.querySelectorAll('[data-test-subj="mlTrainedModelOption"]')
    ).toHaveLength(1);

    // Assert selected
    const comboBoxInput = getByTestId('comboBoxInput');
    expect(comboBoxInput.querySelectorAll('[data-test-subj="mlAdJobOption"]')).toHaveLength(1);
  });

  test('provide current selection update on change', async () => {
    const onChangeSpy = jest.fn();

    const { getByTestId } = render(
      <MlEntitySelector
        selectedOptions={[{ id: 'ad_01', type: 'anomaly_detector' }]}
        onSelectionChange={onChangeSpy}
      />
    );

    await waitFor(() => {
      expect(getByTestId('mlEntitySelector_loaded')).toBeInTheDocument();
    });

    // Assert available options to select
    const optionsContainer = await screen.findByTestId(
      'comboBoxOptionsList mlEntitySelector_loaded-optionsList'
    );

    optionsContainer
      .querySelector<HTMLButtonElement>('[id="data_frame_analytics:dfa_01"]')!
      .click();

    expect(onChangeSpy).toHaveBeenCalledWith([
      { id: 'ad_01', type: 'anomaly_detector' },
      { id: 'dfa_01', type: 'data_frame_analytics' },
    ]);
  });

  test('provide current selection update on change with duplicates handling', async () => {
    (useMlApiContext as jest.MockedFunction<typeof useMlApiContext>).mockImplementationOnce(() => {
      return {
        jobs: {
          getAllJobAndGroupIds,
        },
        dataFrameAnalytics: {
          getDataFrameAnalytics: jest.fn(() => {
            return Promise.resolve({
              count: 2,
              // same ID as the anomaly detection job
              data_frame_analytics: [{ id: 'ad_01' }, { id: 'dfa_02' }],
            });
          }),
        },
        trainedModels: {
          getTrainedModels,
        },
      } as unknown as jest.Mocked<MlApiServices>;
    });

    const onChangeSpy = jest.fn();

    const { getByTestId } = render(
      <MlEntitySelector
        selectedOptions={[{ id: 'ad_01' }, { id: 'keep_it' }]}
        onSelectionChange={onChangeSpy}
        handleDuplicates={true}
      />
    );

    await waitFor(() => {
      expect(getByTestId('mlEntitySelector_loaded')).toBeInTheDocument();
    });

    // Assert selected
    const comboBoxInput = getByTestId('comboBoxInput');
    const selectedOptions = comboBoxInput.querySelectorAll('.euiComboBoxPill');
    expect(selectedOptions).toHaveLength(3);
    expect(selectedOptions[0]).toHaveAttribute('id', 'anomaly_detector:ad_01');
    expect(selectedOptions[1]).toHaveAttribute('id', 'data_frame_analytics:ad_01');

    // Assert removal
    selectedOptions[0].getElementsByTagName('button')[0].click();
    expect(onChangeSpy).toHaveBeenCalledWith([{ id: 'keep_it', type: 'unknown' }]);
  });

  test('display a toast on error', async () => {
    const displayErrorToast = jest.fn();
    const sampleError = new Error('try a bit later');

    (useMlApiContext as jest.MockedFunction<typeof useMlApiContext>).mockImplementationOnce(() => {
      return {
        jobs: {
          getAllJobAndGroupIds: jest.fn(() => {
            throw sampleError;
          }),
        },
      } as unknown as jest.Mocked<MlApiServices>;
    });
    (
      useToastNotificationService as jest.MockedFunction<typeof useToastNotificationService>
    ).mockImplementationOnce(() => {
      return { displayErrorToast } as unknown as ReturnType<typeof useToastNotificationService>;
    });

    const { getByTestId } = render(
      <MlEntitySelector selectedOptions={[{ id: 'ad_01', type: 'anomaly_detector' }]} />
    );

    await waitFor(() => {
      expect(getByTestId('mlEntitySelector_loaded')).toBeInTheDocument();
    });

    expect(displayErrorToast).toHaveBeenCalledTimes(1);
    expect(displayErrorToast).toHaveBeenCalledWith(sampleError, 'Failed to fetch ML entities');
  });
});
