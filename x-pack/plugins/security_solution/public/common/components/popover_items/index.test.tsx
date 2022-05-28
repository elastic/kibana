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
import { within } from '@testing-library/dom';

const mockTags = ['Elastic', 'Endpoint', 'Data Protection', 'ML', 'Continuous Monitoring'];

const renderHelper = (props: Partial<PopoverItemsProps<string>> = {}) =>
  render(
    <TestProviders>
      <PopoverItems
        dataTestPrefix="tags"
        items={mockTags}
        popoverButtonTitle="show mocks"
        renderItem={(item: string, index: number) => <span key={`${item}-${index}`}>{item}</span>}
        {...props}
      />
    </TestProviders>
  );

const getButton = () => screen.getByRole('button', { name: 'show mocks' });
const withinPopover = () => within(screen.getByTestId('tagsDisplayPopoverWrapper'));

describe('Component PopoverItems', () => {
  it('shoud render only 2 first items in display and rest in popup', async () => {
    renderHelper({ numberOfItemsToDisplay: 2 });
    mockTags.slice(0, 2).forEach((tag) => {
      expect(screen.getByText(tag)).toBeInTheDocument();
    });

    // items not rendered yet
    mockTags.slice(2).forEach((tag) => {
      expect(screen.queryByText(tag)).toBeNull();
    });

    getButton().click();
    expect(await screen.findByTestId('tagsDisplayPopoverWrapper')).toBeInTheDocument();

    // items rendered in popup
    mockTags.slice(2).forEach((tag) => {
      expect(withinPopover().getByText(tag)).toBeInTheDocument();
    });
  });

  it('shoud render popover button and items in popover without popover title', () => {
    renderHelper();
    mockTags.forEach((tag) => {
      expect(screen.queryByText(tag)).toBeNull();
    });
    getButton().click();

    mockTags.forEach((tag) => {
      expect(withinPopover().queryByText(tag)).toBeInTheDocument();
    });

    expect(screen.queryByTestId('tagsDisplayPopoverTitle')).toBeNull();
  });

  it('shoud render popover title', async () => {
    renderHelper({ popoverTitle: 'Tags popover title' });

    getButton().click();

    expect(await screen.findByTestId('tagsDisplayPopoverWrapper')).toBeInTheDocument();
    expect(screen.getByTestId('tagsDisplayPopoverTitle')).toHaveTextContent('Tags popover title');
  });
});
