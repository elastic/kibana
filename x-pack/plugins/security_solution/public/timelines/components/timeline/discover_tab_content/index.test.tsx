/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TestProviders } from '../../../../common/mock';
import DiscoverTabContent from '.';
import { render, screen, waitFor } from '@testing-library/react';

const TestComponent = () => {
  return (
    <TestProviders>
      <DiscoverTabContent />
    </TestProviders>
  );
};

describe('Discover Tab Content', () => {
  it('renders', async () => {
    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('timeline-embedded-discover')).toBeInTheDocument();
    });
  });
});
