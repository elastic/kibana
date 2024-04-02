/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { type FlyoutTourProps, FlyoutTour } from './flyout_tour';
import { render, waitFor, fireEvent } from '@testing-library/react';
import {
  createMockStore,
  createSecuritySolutionStorageMock,
  TestProviders,
} from '../../../../common/mock';
import { useKibana as mockUseKibana } from '../../../../common/lib/kibana/__mocks__';
import { useKibana } from '../../../../common/lib/kibana';

jest.mock('../../../../common/lib/kibana');

const mockedUseKibana = mockUseKibana();

const { storage: storageMock } = createSecuritySolutionStorageMock();
const mockStore = createMockStore(undefined, undefined, undefined, storageMock);

const content = [1, 2].map((i) => ({
  title: `step${i}`,
  content: <p>{`step${i}`}</p>,
  stepNumber: i,
  anchor: `step${i}`,
}));

const tourProps = {
  tourStepContent: content,
  totalSteps: 2,
};
const switchPanel = jest.fn();

const renderTour = (props: FlyoutTourProps) =>
  render(
    <TestProviders store={mockStore}>
      <FlyoutTour {...props} />
      <div data-test-subj="step1" />
      <div data-test-subj="step2" />
    </TestProviders>
  );

describe('Flyout Tour', () => {
  beforeEach(() => {
    (useKibana as jest.Mock).mockReturnValue({
      ...mockedUseKibana,
      services: {
        ...mockedUseKibana.services,
        storage: storageMock,
      },
    });

    storageMock.clear();
  });

  it('should  render tour steps', async () => {
    const { getByTestId, getByText } = renderTour(tourProps);

    await waitFor(() => {
      expect(getByTestId('flyout-tour-step-1')).toBeVisible();
    });

    fireEvent.click(getByText('Next'));
    await waitFor(() => {
      expect(getByTestId('flyout-tour-step-2')).toBeVisible();
    });

    await waitFor(() => {
      expect(getByText('Finish')).toBeVisible();
    });
  });

  it('should call switch panel callback when it is available', async () => {
    const { getByTestId, getByText } = renderTour({
      ...tourProps,
      onPanelSwitch: switchPanel,
      switchStep: 1,
    });

    await waitFor(() => {
      expect(getByTestId('flyout-tour-step-1')).toBeVisible();
    });

    fireEvent.click(getByText('Next'));

    await waitFor(() => {
      expect(switchPanel).toHaveBeenCalled();
      expect(getByTestId('flyout-tour-step-2')).toBeVisible();
    });

    await waitFor(() => {
      expect(getByText('Finish')).toBeVisible();
    });
  });
});
