/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { OnboardingHeaderVideoModal } from './video_modal';

const mockOnCloseModal = jest.fn();

describe('VideoCardComponent', () => {
  it('should render the title, description', () => {
    const { getByText } = render(<OnboardingHeaderVideoModal onClose={mockOnCloseModal} />);

    expect(getByText('Welcome to Elastic Security!')).toBeInTheDocument();
    expect(
      getByText(
        "We're excited to support you in protecting your organization's data. Here's a preview of the steps you'll take to set up."
      )
    ).toBeInTheDocument();
  });

  it('should render the button label "Close" on isOnboardingHubVisited true', () => {
    const { getByTestId } = render(<OnboardingHeaderVideoModal onClose={mockOnCloseModal} />);
    expect(getByTestId('video-modal-button')).toHaveTextContent('Close');
  });

  it('should render the button label "Head to steps" on isOnboardingHubVisited false', () => {
    const { getByTestId } = render(<OnboardingHeaderVideoModal onClose={mockOnCloseModal} />);
    expect(getByTestId('video-modal-button')).toHaveTextContent('Head to steps');
  });
});
