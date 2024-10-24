/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { LinkCard } from './link_card';
import { OnboardingHeaderCardId, TELEMETRY_HEADER_CARD } from '../../../constants';
import { trackOnboardingLinkClick } from '../../../../common/lib/telemetry';

jest.mock('../../../../common/lib/telemetry');

describe('DataIngestionHubHeaderCardComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the title, description, and icon', () => {
    const { getByTestId, getByText } = render(
      <LinkCard
        id={OnboardingHeaderCardId.demo}
        icon={'mockIcon.png'}
        title={'Mock Title'}
        description={'Mock Description'}
        linkText="test"
      />
    );

    expect(getByText('Mock Title')).toBeInTheDocument();
    expect(getByText('Mock Description')).toBeInTheDocument();
    expect(getByTestId('data-ingestion-header-card-icon')).toHaveAttribute('src', 'mockIcon.png');
  });

  it('should track the link card click', () => {
    const { getByTestId } = render(
      <LinkCard
        id={OnboardingHeaderCardId.demo}
        icon={'mockIcon.png'}
        title={'Mock Title'}
        description={'Mock Description'}
        linkText="test"
      />
    );

    getByTestId('headerCardLink').click();
    expect(trackOnboardingLinkClick).toHaveBeenCalledWith(
      `${TELEMETRY_HEADER_CARD}_${OnboardingHeaderCardId.demo}`
    );
  });

  it('should apply dark mode styles when color mode is DARK', () => {
    const { container } = render(
      <LinkCard
        id={OnboardingHeaderCardId.demo}
        icon={'mockIcon.png'}
        title={'Mock Title'}
        description={'Mock Description'}
        linkText="test"
      />
    );
    const cardElement = container.querySelector('.euiCard');
    expect(cardElement).toHaveStyle('background-color:rgb(255, 255, 255)');
  });
});
