/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@elastic/eui/lib/test/rtl';
import { fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { JourneyStepImagePopover, StepImagePopoverProps } from './journey_step_image_popover';
import { render } from '../../../utils/testing';

describe('JourneyStepImagePopover', () => {
  let defaultProps: StepImagePopoverProps;

  beforeEach(() => {
    defaultProps = {
      captionContent: 'test caption',
      imageCaption: <div>test caption element</div>,
      imgSrc: 'http://sample.com/sampleImageSrc.png',
      isImagePopoverOpen: false,
      isStepFailed: false,
      isLoading: false,
    };
  });

  it('opens displays full-size image on click, hides after close is clicked', async () => {
    const { getByAltText } = render(<JourneyStepImagePopover {...defaultProps} />);

    expect(screen.queryByTestSubject('deactivateFullScreenButton')).toBeNull();

    const caption = getByAltText('test caption');
    fireEvent.click(caption);

    await waitFor(() => {
      fireEvent.click(screen.getByTestSubject('deactivateFullScreenButton'));
    });

    await waitFor(() => {
      expect(screen.queryByTestSubject('deactivateFullScreenButton')).toBeNull();
    });
  });

  it('shows the popover when `isOpen` is true', () => {
    defaultProps.isImagePopoverOpen = true;

    const { getByAltText } = render(<JourneyStepImagePopover {...defaultProps} />);

    expect(getByAltText(`A larger version of the screenshot for this journey step's thumbnail.`));
  });

  it('renders caption content', () => {
    const { getByRole } = render(<JourneyStepImagePopover {...defaultProps} />);
    const image = getByRole('img');
    expect(image).toHaveAttribute('alt', 'test caption');
    expect(image).toHaveAttribute('src', 'http://sample.com/sampleImageSrc.png');
  });
});
