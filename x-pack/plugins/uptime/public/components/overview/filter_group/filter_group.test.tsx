/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../../lib/helper/rtl_helpers';
import { FilterGroupComponent } from './filter_group';

describe('FilterGroupComponent', () => {
  const overviewFilters = {
    locations: ['nyc', 'fairbanks'],
    ports: [5601, 9200],
    schemes: ['http', 'tcp'],
    tags: ['prod', 'dev'],
  };
  it.each([
    ['expands filter group for Location filter', 'Search for location'],
    ['expands filter group for Port filter', 'Search for port'],
    ['expands filter group for Scheme filter', 'Search for scheme'],
    ['expands filter group for Tag filter', 'Search for tag'],
  ])('handles loading', async (popoverButtonLabel, searchInputLabel) => {
    const { getByLabelText } = render(
      <FilterGroupComponent loading={true} overviewFilters={overviewFilters} />
    );

    const popoverButton = getByLabelText(popoverButtonLabel);
    fireEvent.click(popoverButton);
    await waitFor(() => {
      const searchInput = getByLabelText(searchInputLabel);
      expect(searchInput).toHaveAttribute('placeholder', 'Loading...');
    });
  });

  it.each([
    [
      'expands filter group for Location filter',
      'Search for location',
      ['Filter by Location nyc.', 'Filter by Location fairbanks.'],
    ],
    [
      'expands filter group for Port filter',
      'Search for port',
      ['Filter by Port 5601.', 'Filter by Port 9200.'],
    ],
    [
      'expands filter group for Scheme filter',
      'Search for scheme',
      ['Filter by Scheme http.', 'Filter by Scheme tcp.'],
    ],
    [
      'expands filter group for Tag filter',
      'Search for tag',
      ['Filter by Tag prod.', 'Filter by Tag dev.'],
    ],
  ])(
    'displays filter items when clicked',
    async (popoverButtonLabel, searchInputLabel, filterItemButtonLabels) => {
      const { getByLabelText } = render(
        <FilterGroupComponent loading={false} overviewFilters={overviewFilters} />
      );

      const popoverButton = getByLabelText(popoverButtonLabel);
      fireEvent.click(popoverButton);
      await waitFor(() => {
        expect(getByLabelText(searchInputLabel));
        filterItemButtonLabels.forEach((itemLabel) => expect(getByLabelText(itemLabel)));
      });
    }
  );
});
