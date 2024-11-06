/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { DashboardsCard } from './dashboards_card';
import { TestProviders } from '../../../../../common/mock';
import { OnboardingCardId } from '../../../../constants';

jest.mock('../../../onboarding_context');

const props = {
  setComplete: jest.fn(),
  checkComplete: jest.fn(),
  isCardComplete: jest.fn(),
  setExpandedCardId: jest.fn(),
};

describe('RulesCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('description should be in the document', () => {
    const { getByTestId } = render(
      <TestProviders>
        <DashboardsCard {...props} />
      </TestProviders>
    );

    expect(getByTestId('dashboardsDescription')).toBeInTheDocument();
  });

  it('card callout should be rendered if integrations cards is not complete', () => {
    props.isCardComplete.mockReturnValueOnce(false);

    const { getByText } = render(
      <TestProviders>
        <DashboardsCard {...props} />
      </TestProviders>
    );

    expect(getByText('To view dashboards add integrations first.')).toBeInTheDocument();
  });

  it('card button should be disabled if integrations cards is not complete', () => {
    props.isCardComplete.mockReturnValueOnce(false);

    const { getByTestId } = render(
      <TestProviders>
        <DashboardsCard {...props} />
      </TestProviders>
    );

    expect(getByTestId('dashboardsCardButton').querySelector('button')).toBeDisabled();
  });
  it('should expand integrations card when callout link is clicked', () => {
    props.isCardComplete.mockReturnValueOnce(false); // To show the callout

    const { getByTestId } = render(
      <TestProviders>
        <DashboardsCard {...props} />
      </TestProviders>
    );

    const link = getByTestId('dashboardsCardCalloutLink');
    fireEvent.click(link);

    expect(props.setExpandedCardId).toHaveBeenCalledWith(OnboardingCardId.integrations, {
      scroll: true,
    });
  });
});
