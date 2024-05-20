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
import { FLYOUT_TOUR_TEST_ID } from './test_ids';

jest.mock('../../../../common/lib/kibana');

const mockedUseKibana = mockUseKibana();

const { storage: storageMock } = createSecuritySolutionStorageMock();
const mockStore = createMockStore(undefined, undefined, undefined, storageMock);

const content = [1, 2, 3, 4].map((i) => ({
  title: `step${i}`,
  content: <p>{`step${i}`}</p>,
  stepNumber: i,
  anchor: `step${i}`,
}));

const tourProps = {
  tourStepContent: content,
  totalSteps: 4,
};
const goToLeftPanel = jest.fn();
const goToOverviewTab = jest.fn();

const renderTour = (props: FlyoutTourProps) =>
  render(
    <TestProviders store={mockStore}>
      <FlyoutTour {...props} />
      <div data-test-subj="step1" />
      <div data-test-subj="step2" />
      <div data-test-subj="step3" />
      <div data-test-subj="step4" />
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
    const wrapper = renderTour(tourProps);

    await waitFor(() => {
      expect(wrapper.getByTestId(`${FLYOUT_TOUR_TEST_ID}-1`)).toBeVisible();
    });
    fireEvent.click(wrapper.getByText('Next'));
    await waitFor(() => {
      expect(wrapper.getByTestId(`${FLYOUT_TOUR_TEST_ID}-2`)).toBeVisible();
    });
    fireEvent.click(wrapper.getByText('Next'));
    await waitFor(() => {
      expect(wrapper.getByTestId(`${FLYOUT_TOUR_TEST_ID}-3`)).toBeVisible();
    });
    fireEvent.click(wrapper.getByText('Next'));
    await waitFor(() => {
      expect(wrapper.getByTestId(`${FLYOUT_TOUR_TEST_ID}-4`)).toBeVisible();
    });
    await waitFor(() => {
      expect(wrapper.getByText('Finish')).toBeVisible();
    });
  });

  it('should call goToOverview at step 1', () => {
    renderTour({
      ...tourProps,
      goToOverviewTab,
    });
    expect(goToOverviewTab).toHaveBeenCalled();
  });

  it('should call goToLeftPanel when after step 3', async () => {
    const wrapper = renderTour({
      ...tourProps,
      goToLeftPanel,
    });

    await waitFor(() => {
      expect(wrapper.getByTestId(`${FLYOUT_TOUR_TEST_ID}-1`)).toBeVisible();
    });
    fireEvent.click(wrapper.getByText('Next'));
    await waitFor(() => {
      expect(wrapper.getByTestId(`${FLYOUT_TOUR_TEST_ID}-2`)).toBeVisible();
    });
    fireEvent.click(wrapper.getByText('Next'));
    await waitFor(() => {
      expect(wrapper.getByTestId(`${FLYOUT_TOUR_TEST_ID}-3`)).toBeVisible();
    });
    fireEvent.click(wrapper.getByText('Next'));

    expect(goToLeftPanel).toHaveBeenCalled();
  });
});
