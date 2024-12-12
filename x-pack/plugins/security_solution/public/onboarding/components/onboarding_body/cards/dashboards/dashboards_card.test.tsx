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
  isCardAvailable: jest.fn(),
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

  it('card callout should be rendered if integrations card is available but not complete', () => {
    props.isCardAvailable.mockReturnValueOnce(true);
    props.isCardComplete.mockReturnValueOnce(false);

    const { getByText } = render(
      <TestProviders>
        <OnboardingContextProvider spaceId="default">
          <DashboardsCard {...props} />
        </OnboardingContextProvider>
      </TestProviders>
    );

    expect(getByText('To view dashboards add integrations first.')).toBeInTheDocument();
  });

  it('card callout should not be rendered if integrations card is not available', () => {
    props.isCardAvailable.mockReturnValueOnce(false);

    const { queryByText } = render(
      <TestProviders>
        <DashboardsCard {...props} />
      </TestProviders>
    );

    expect(queryByText('To view dashboards add integrations first.')).not.toBeInTheDocument();
  });

  it('card button should be disabled if integrations card is available but not complete', () => {
    props.isCardAvailable.mockReturnValueOnce(true);
    props.isCardComplete.mockReturnValueOnce(false);

    const { getByTestId } = render(
      <TestProviders>
        <OnboardingContextProvider spaceId="default">
          <DashboardsCard {...props} />
        </OnboardingContextProvider>
      </TestProviders>
    );

    expect(getByTestId('dashboardsCardButton').querySelector('button')).toBeDisabled();
  });

  it('card button should be enabled if integrations card is complete', () => {
    props.isCardAvailable.mockReturnValueOnce(true);
    props.isCardComplete.mockReturnValueOnce(true);

    const { getByTestId } = render(
      <TestProviders>
        <DashboardsCard {...props} />
      </TestProviders>
    );

    expect(getByTestId('dashboardsCardButton').querySelector('button')).not.toBeDisabled();
  });

  it('should expand integrations card when callout link is clicked', () => {
    props.isCardAvailable.mockReturnValueOnce(true);
    props.isCardComplete.mockReturnValueOnce(false); // To show the callout

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
