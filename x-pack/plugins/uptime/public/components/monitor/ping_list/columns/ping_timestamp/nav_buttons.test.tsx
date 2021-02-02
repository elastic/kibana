/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { render } from '../../../../../lib/helper/rtl_helpers';
import { NavButtons, NavButtonsProps } from './nav_buttons';

describe('NavButtons', () => {
  let defaultProps: NavButtonsProps;

  beforeEach(() => {
    defaultProps = {
      maxSteps: 3,
      stepNumber: 2,
      setStepNumber: jest.fn(),
      setIsImagePopoverOpen: jest.fn(),
    };
  });

  it('labels prev and next buttons', () => {
    const { getByLabelText } = render(<NavButtons {...defaultProps} />);

    expect(getByLabelText('Previous step'));
    expect(getByLabelText('Next step'));
  });

  it('increments step number on next click', async () => {
    const { getByLabelText } = render(<NavButtons {...defaultProps} />);

    const nextButton = getByLabelText('Next step');

    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(defaultProps.setStepNumber).toHaveBeenCalledTimes(1);
      expect(defaultProps.setStepNumber).toHaveBeenCalledWith(3);
    });
  });

  it('decrements step number on prev click', async () => {
    const { getByLabelText } = render(<NavButtons {...defaultProps} />);

    const nextButton = getByLabelText('Previous step');

    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(defaultProps.setStepNumber).toHaveBeenCalledTimes(1);
      expect(defaultProps.setStepNumber).toHaveBeenCalledWith(1);
    });
  });

  it('disables `next` button on final step', () => {
    defaultProps.stepNumber = 3;

    const { getByLabelText } = render(<NavButtons {...defaultProps} />);

    // getByLabelText('Next step');
    expect(getByLabelText('Next step')).toHaveAttribute('disabled');
    expect(getByLabelText('Previous step')).not.toHaveAttribute('disabled');
  });

  it('disables `prev` button on final step', () => {
    defaultProps.stepNumber = 1;

    const { getByLabelText } = render(<NavButtons {...defaultProps} />);

    expect(getByLabelText('Next step')).not.toHaveAttribute('disabled');
    expect(getByLabelText('Previous step')).toHaveAttribute('disabled');
  });

  it('opens popover when mouse enters', async () => {
    const { getByLabelText } = render(<NavButtons {...defaultProps} />);

    const nextButton = getByLabelText('Next step');

    fireEvent.mouseEnter(nextButton);

    await waitFor(() => {
      expect(defaultProps.setIsImagePopoverOpen).toHaveBeenCalledTimes(1);
      expect(defaultProps.setIsImagePopoverOpen).toHaveBeenCalledWith(true);
    });
  });
});
