/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { TestProviders } from '../../../../../common/mock';
import { OnboardingContextProvider } from '../../../onboarding_context';
import DashboardsCard from './dashboards_card';

const mockSetComplete = jest.fn();
const mockSetExpandedCardId = jest.fn();
const mockIsCardComplete = jest.fn();

const props = {
  setComplete: mockSetComplete,
  checkComplete: jest.fn(),
  isCardComplete: mockIsCardComplete,
  setExpandedCardId: mockSetExpandedCardId,
  isExpanded: true,
};

describe('DashboardsCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('description should be in the document', () => {
    const { getByTestId } = render(
      <TestProviders>
        <OnboardingContextProvider spaceId="default">
          <DashboardsCard {...props} />
        </OnboardingContextProvider>
      </TestProviders>
    );

    expect(getByTestId('dashboardsDescription')).toBeInTheDocument();
  });

  it('renders card callout if integrations card is not complete', () => {
    mockIsCardComplete.mockReturnValueOnce(false);

    const { getByText } = render(
      <TestProviders>
        <OnboardingContextProvider spaceId="default">
          <DashboardsCard {...props} />
        </OnboardingContextProvider>
      </TestProviders>
    );

    expect(getByText('To view dashboards add integrations first.')).toBeInTheDocument();
  });

  it('renders a disabled button if integrations card is not complete', () => {
    mockIsCardComplete.mockReturnValueOnce(false);

    const { getByTestId } = render(
      <TestProviders>
        <OnboardingContextProvider spaceId="default">
          <DashboardsCard {...props} />
        </OnboardingContextProvider>
      </TestProviders>
    );

    expect(getByTestId('dashboardsCardButton').querySelector('button')).toBeDisabled();
  });

  it('renders an enabled button if integrations card is complete', () => {
    mockIsCardComplete.mockReturnValueOnce(true);

    const { getByTestId } = render(
      <TestProviders>
        <OnboardingContextProvider spaceId="default">
          <DashboardsCard {...props} />
        </OnboardingContextProvider>
      </TestProviders>
    );

    expect(getByTestId('dashboardsCardButton').querySelector('button')).not.toBeDisabled();
  });

  it('calls setExpandedCardId when the callout link is clicked', () => {
    mockIsCardComplete.mockReturnValueOnce(false);

    const { getByText } = render(
      <TestProviders>
        <OnboardingContextProvider spaceId="default">
          <DashboardsCard {...props} />
        </OnboardingContextProvider>
      </TestProviders>
    );

    const calloutLink = getByText('Add integrations step');
    fireEvent.click(calloutLink);

    expect(mockSetExpandedCardId).toHaveBeenCalledWith('integrations', { scroll: true });
  });
});
