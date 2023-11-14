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
import { TimelineId } from '../../../../../common/types';

const TestComponent = () => {
  return (
    <TestProviders>
      <DiscoverTabContent timelineId={TimelineId.test} />
    </TestProviders>
  );
};

describe('Discover Tab Content', () => {
  it('should render', async () => {
    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('timeline-embedded-discover')).toBeInTheDocument();
    });
  });

  // issue for enabling below tests: https://github.com/elastic/kibana/issues/165913
  it.skip('should load saved search when a saved timeline is restored', () => {});
  it.skip('should reset the discover state when new timeline is created', () => {});
  it.skip('should update saved search if timeline title and description are updated', () => {});
  it.skip('should should not update saved search if the fetched saved search is same as discover updated saved search', () => {});
  it.skip('should update saved search if discover time is update', () => {});
});
