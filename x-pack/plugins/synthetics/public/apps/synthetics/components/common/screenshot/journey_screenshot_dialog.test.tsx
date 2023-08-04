/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import 'jest-canvas-mock';
import React from 'react';
import userEvent from '@testing-library/user-event';
import { render } from '../../../utils/testing/rtl_helpers';
import { JourneyScreenshotDialog } from './journey_screenshot_dialog';

const testCheckGroup = 'test-check-group';
const testImgUrl1 = 'test-img-url-1';

const testImageDataResult = {
  ['/internal/uptime/journey/screenshot/test-check-group/1']: {
    attempts: 1,
    data: {},
    url: 'http://localhost/test-img-url-1',
    stepName: 'First step',
    loading: false,
    maxSteps: 2,
  },
  ['/internal/uptime/journey/screenshot/test-check-group/2']: {
    attempts: 1,
    data: {},
    url: 'http://localhost/test-img-url-2',
    stepName: 'Second step',
    loading: true,
    maxSteps: 2,
  },
};
jest.mock('../monitor_test_result/use_retrieve_step_image', () => ({
  useRetrieveStepImage: () => testImageDataResult,
}));

describe('JourneyScreenshotDialog', () => {
  const onCloseMock = jest.fn();

  const testProps = {
    checkGroup: testCheckGroup,
    initialImgSrc: testImgUrl1,
    initialStepNumber: 1,
    maxSteps: 2,
    isOpen: true,
    onClose: onCloseMock,
  };

  afterAll(() => {
    jest.clearAllMocks();
  });

  it('renders without errors', () => {
    expect(() => render(<JourneyScreenshotDialog {...testProps} />)).not.toThrowError();
  });

  it('shows loading indicator when image is loading', async () => {
    const { getByTestId, queryByTestId } = render(<JourneyScreenshotDialog {...testProps} />);

    expect(queryByTestId('screenshotImageLoadingProgress')).not.toBeInTheDocument();
    userEvent.click(getByTestId('screenshotImageNextButton'));
  });

  it('respects maxSteps', () => {
    const { getByTestId, queryByTestId } = render(<JourneyScreenshotDialog {...testProps} />);

    expect(queryByTestId('screenshotImageLoadingProgress')).not.toBeInTheDocument();
    userEvent.click(getByTestId('screenshotImageNextButton'));
    expect(getByTestId('screenshotImageNextButton')).toHaveProperty('disabled');
  });

  it('shows correct image source and step name', () => {
    const { getByText, queryByTestId } = render(<JourneyScreenshotDialog {...testProps} />);
    expect(queryByTestId('stepScreenshotThumbnail')).toHaveProperty(
      'src',
      'http://localhost/test-img-url-1'
    );
    expect(getByText('Step: 1 of 1')).toBeInTheDocument();
  });
});
