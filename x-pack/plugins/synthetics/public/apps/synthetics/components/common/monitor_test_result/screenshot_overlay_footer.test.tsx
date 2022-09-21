/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { render } from '../../../utils/testing';
import { ScreenshotOverlayFooter, ScreenshotOverlayFooterProps } from './screenshot_overlay_footer';
import { getShortTimeStamp } from '../../../utils/monitor_test_result/timestamp';
import moment from 'moment';
import { mockRef } from '../../../utils/testing/__mocks__/screenshot_ref.mock';

describe('ScreenshotOverlayFooter', () => {
  let defaultProps: ScreenshotOverlayFooterProps;

  beforeEach(() => {
    defaultProps = {
      captionContent: 'test caption content',
      imgSrc: 'http://sample.com/sampleImageSrc.png',
      maxSteps: 3,
      setStepNumber: jest.fn(),
      stepNumber: 2,
      label: getShortTimeStamp(moment('2020-11-26T15:28:56.896Z')),
      onVisible: jest.fn(),
      isLoading: false,
    };
  });

  it('labels prev and next buttons', () => {
    const { getByLabelText } = render(<ScreenshotOverlayFooter {...defaultProps} />);

    expect(getByLabelText('Previous step'));
    expect(getByLabelText('Next step'));
  });

  it('increments step number on next click', async () => {
    const { getByLabelText } = render(<ScreenshotOverlayFooter {...defaultProps} />);

    const nextButton = getByLabelText('Next step');

    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(defaultProps.setStepNumber).toHaveBeenCalledTimes(1);
      expect(defaultProps.setStepNumber).toHaveBeenCalledWith(3);
    });
  });

  it('decrements step number on prev click', async () => {
    const { getByLabelText } = render(<ScreenshotOverlayFooter {...defaultProps} />);

    const nextButton = getByLabelText('Previous step');

    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(defaultProps.setStepNumber).toHaveBeenCalledTimes(1);
      expect(defaultProps.setStepNumber).toHaveBeenCalledWith(1);
    });
  });

  it('disables `next` button on final step', () => {
    defaultProps.stepNumber = 3;

    const { getByLabelText } = render(<ScreenshotOverlayFooter {...defaultProps} />);

    // getByLabelText('Next step');
    expect(getByLabelText('Next step')).toHaveAttribute('disabled');
    expect(getByLabelText('Previous step')).not.toHaveAttribute('disabled');
  });

  it('disables `prev` button on final step', () => {
    defaultProps.stepNumber = 1;

    const { getByLabelText } = render(<ScreenshotOverlayFooter {...defaultProps} />);

    expect(getByLabelText('Next step')).not.toHaveAttribute('disabled');
    expect(getByLabelText('Previous step')).toHaveAttribute('disabled');
  });

  it('renders a timestamp', () => {
    const { getByText } = render(<ScreenshotOverlayFooter {...defaultProps} />);

    getByText('Nov 26, 2020 10:28:56 AM');
  });

  it('renders caption content', () => {
    const { getByText } = render(<ScreenshotOverlayFooter {...defaultProps} />);

    getByText('test caption content');
  });

  it('renders caption content for screenshot ref data', async () => {
    const { getByText } = render(
      <ScreenshotOverlayFooter {...{ ...defaultProps, imgRef: mockRef, imgSrc: undefined }} />
    );

    getByText('test caption content');
  });
});
