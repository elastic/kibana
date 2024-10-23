/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import IntegrationsCard from './integrations_card';
import { render } from '@testing-library/react';
jest.mock('./integration_card_grid_tabs');

const props = {
  setComplete: jest.fn(),
  checkComplete: jest.fn(),
  isCardComplete: jest.fn(),
  setExpandedCardId: jest.fn(),
};

describe('IntegrationsCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a loading spinner when checkCompleteMetadata is undefined', () => {
    const { getByTestId } = render(
      <IntegrationsCard {...props} checkCompleteMetadata={undefined} />
    );
    expect(getByTestId('loadingInstalledIntegrations')).toBeInTheDocument();
  });

  it('renders the content', () => {
    const { queryByTestId } = render(
      <IntegrationsCard
        {...props}
        checkCompleteMetadata={{ installedIntegrationsCount: 1, isAgentRequired: false }}
      />
    );
    expect(queryByTestId('loadingInstalledIntegrations')).not.toBeInTheDocument();
    expect(queryByTestId('integrationsCardGridTabs')).toBeInTheDocument();
  });
});
