/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import { JourneyStepScreenshotContainer } from './journey_step_screenshot_container';
import { render } from '../../../utils/testing';
import * as observabilityPublic from '@kbn/observability-plugin/public';
import * as retrieveHooks from '../monitor_test_result/use_retrieve_step_image';

jest.mock('@kbn/observability-plugin/public');

jest.setTimeout(10 * 1000);

const imgPath1 = '/internal/uptime/journey/screenshot/test-check-group/1';
const imgPath2 = '/internal/uptime/journey/screenshot/test-check-group/2';
const testImageDataResult = {
  [imgPath1]: {
    attempts: 1,
    data: undefined,
    url: 'http://localhost/test-img-url-1',
    stepName: 'First step',
    loading: false,
    maxSteps: 2,
  },
  [imgPath2]: {
    attempts: 1,
    data: undefined,
    url: 'http://localhost/test-img-url-2',
    stepName: 'Second step',
    loading: true,
    maxSteps: 2,
  },
};

describe('JourneyStepScreenshotContainer', () => {
  let checkGroup: string;
  const { FETCH_STATUS } = observabilityPublic;

  beforeAll(() => {
    checkGroup = 'test-check-group';
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it.each([[FETCH_STATUS.PENDING], [FETCH_STATUS.LOADING]])(
    'displays spinner when loading step image',
    (fetchStatus) => {
      jest
        .spyOn(observabilityPublic, 'useFetcher')
        .mockReturnValue({ status: fetchStatus, data: null, refetch: () => null, loading: true });
      const { getByTestId } = render(<JourneyStepScreenshotContainer checkGroup={checkGroup} />);
      expect(getByTestId('stepScreenshotPlaceholderLoading')).toBeInTheDocument();
    }
  );

  it('displays no image available when img src is unavailable and fetch status is successful', () => {
    jest
      .spyOn(observabilityPublic, 'useFetcher')
      .mockReturnValue({ status: FETCH_STATUS.SUCCESS, data: null, refetch: () => null });
    const { getByTestId } = render(
      <JourneyStepScreenshotContainer checkGroup={checkGroup} allStepsLoaded={true} />
    );
    expect(getByTestId('stepScreenshotNotAvailable')).toBeInTheDocument();
  });

  it('displays image when img src is available from useFetcher', () => {
    jest.spyOn(retrieveHooks, 'useRetrieveStepImage').mockReturnValue(testImageDataResult);
    const { container } = render(<JourneyStepScreenshotContainer checkGroup={checkGroup} />);
    expect(container.querySelector('img')?.src).toBe(testImageDataResult[imgPath1].url);
  });

  it('displays popover image when mouse enters img caption, and hides onLeave', async () => {
    jest.spyOn(retrieveHooks, 'useRetrieveStepImage').mockReturnValue(testImageDataResult);
    const { getByAltText, getByText, queryByText } = render(
      <JourneyStepScreenshotContainer checkGroup={checkGroup} />
    );

    const img = getByAltText('First step');
    const euiPopoverMessage = 'You are in a dialog. To close this dialog, hit escape.';
    expect(queryByText(euiPopoverMessage)).toBeNull();
    fireEvent.mouseEnter(img);
    await waitFor(() => getByText(euiPopoverMessage));
    expect(getByText(euiPopoverMessage)).toBeInTheDocument();

    fireEvent.mouseLeave(img);
    await waitForElementToBeRemoved(queryByText(euiPopoverMessage));
  });

  it('opens dialog when img is clicked and shows step numbers', async () => {
    jest.spyOn(retrieveHooks, 'useRetrieveStepImage').mockReturnValue(testImageDataResult);

    const { getByAltText, getByText } = render(
      <JourneyStepScreenshotContainer checkGroup={checkGroup} />
    );

    const img = getByAltText('First step');
    await waitFor(() => img);
    fireEvent.click(img);

    expect(getByText('Step: 1 of 2'));
  });
});
