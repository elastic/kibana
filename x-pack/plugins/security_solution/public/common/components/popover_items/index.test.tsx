/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { PopoverItems, PopoverItemsProps } from '.';
import { TestProviders } from '../../mock';
import { render, screen } from '@testing-library/react';

const mockTags = ['Elastic', 'Endpoint', 'Data Protection', 'ML', 'Continuous Monitoring'];

const renderHelper = (props: Partial<PopoverItemsProps<unknown>> = {}) =>
  render(
    <TestProviders>
      <PopoverItems
        dataTestEntity="tags"
        items={mockTags}
        popoverButtonTitle="show mocks"
        renderItem={
          ((item: string, index: number) => (
            <span key={`${item}-${index}`}>{item}</span>
          )) as PopoverItemsProps<unknown>['renderItem']
        }
        {...props}
      />
    </TestProviders>
  );

describe('Component PopoverItems', () => {
  it('shoud render only 2 first items as configured and popup button', () => {
    renderHelper({ numberOfItemsToDisplay: 2 });
    mockTags.slice(0, 2).forEach((tag) => {
      expect(screen.getByText(tag)).toBeInTheDocument();
    });
    mockTags.slice(2).forEach((tag) => {
      expect(screen.queryByText(tag)).toBeNull();
    });
    expect(screen.getByRole('button', { name: 'show mocks' })).toBeInTheDocument();
  });

  it('shoud render popover button without displayed items but with popup button', () => {
    renderHelper();
    mockTags.forEach((tag) => {
      expect(screen.queryByText(tag)).toBeNull();
    });
    expect(screen.getByRole('button', { name: 'show mocks' })).toBeInTheDocument();
  });

  it('shoud open popup on button click and render all tags with popover title', async () => {
    renderHelper({ popoverTitle: 'Tags popover title' });

    screen.getByRole('button', { name: 'show mocks' }).click();

    expect(await screen.findByTestId('tags-display-popover-wrapper')).toBeInTheDocument();
    expect(screen.getByTestId('tags-display-popover-title')).toHaveTextContent(
      'Tags popover title'
    );

    mockTags.forEach((tag) => {
      expect(screen.queryByText(tag)).toBeInTheDocument();
    });
  });

  it('shoud open popup on button click and render all tags without popover title', async () => {
    renderHelper();
    screen.getByRole('button', { name: 'show mocks' }).click();

    expect(await screen.findByTestId('tags-display-popover-wrapper')).toBeInTheDocument();
    expect(screen.queryByTestId('tags-display-popover-title')).toBeNull();

    mockTags.forEach((tag) => {
      expect(screen.queryByText(tag)).toBeInTheDocument();
    });
  });
});
