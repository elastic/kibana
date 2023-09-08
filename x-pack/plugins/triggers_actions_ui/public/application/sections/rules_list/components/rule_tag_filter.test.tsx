/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { RuleTagFilter } from './rule_tag_filter';

const onChangeMock = jest.fn();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
  },
});

const observe = jest.fn();
const unobserve = jest.fn();
const disconnect = jest.fn();

jest.mock('../../../../common/lib/kibana');

const WithProviders = ({ children }: { children: any }) => (
  <IntlProvider locale="en">
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </IntlProvider>
);

jest.mock('../../../lib/rule_api/aggregate', () => ({
  loadRuleTags: jest.fn(),
}));

const { loadRuleTags } = jest.requireMock('../../../lib/rule_api/aggregate');

const renderWithProviders = (ui: any) => {
  return render(ui, { wrapper: WithProviders });
};

const tags = ['a', 'b', 'c', 'd', 'e', 'f'];

describe('rule_tag_filter', () => {
  beforeEach(() => {
    Object.assign(window, {
      IntersectionObserver: jest.fn(() => ({
        observe,
        unobserve,
        disconnect,
      })),
    });
    jest.clearAllMocks();
    loadRuleTags.mockResolvedValue({
      data: tags,
      page: 1,
      perPage: 50,
      total: 6,
    });
  });

  it('renders correctly', async () => {
    renderWithProviders(<RuleTagFilter selectedTags={[]} onChange={onChangeMock} />);
    expect(await screen.findByTestId('ruleTagFilterButton')).toBeInTheDocument();
    expect(await screen.findByLabelText('0 available filters')).toBeInTheDocument();
  });

  it('can open the popover correctly', async () => {
    renderWithProviders(<RuleTagFilter selectedTags={[]} onChange={onChangeMock} />);
    expect(screen.queryByTestId('ruleTagFilterSelectable')).not.toBeInTheDocument();

    // Open popover
    fireEvent.click(await screen.findByTestId('ruleTagFilterButton'));
    expect(await screen.findByTestId('ruleTagFilterSelectable')).toBeInTheDocument();

    expect((await screen.findAllByRole('option')).length).toEqual(tags.length);

    // Close popover
    fireEvent.click(await screen.findByTestId('ruleTagFilterButton'));
    await waitForElementToBeRemoved(() => screen.queryByTestId('ruleTagFilterSelectable'));

    expect(screen.queryByTestId('ruleTagFilterSelectable')).not.toBeInTheDocument();
  });

  it('can select tags', async () => {
    renderWithProviders(<RuleTagFilter selectedTags={[]} onChange={onChangeMock} />);
    // Open popover
    fireEvent.click(await screen.findByTestId('ruleTagFilterButton'));
    fireEvent.click(await screen.findByTestId('ruleTagFilterOption-a'));

    expect(onChangeMock).toHaveBeenLastCalledWith(['a']);
  });

  it('can unselect tags', async () => {
    renderWithProviders(<RuleTagFilter selectedTags={['a']} onChange={onChangeMock} />);
    // Open popover
    fireEvent.click(await screen.findByTestId('ruleTagFilterButton'));
    fireEvent.click(await screen.findByTestId('ruleTagFilterOption-a'));

    expect(onChangeMock).toHaveBeenLastCalledWith([]);
  });

  it('renders selected tags even if they get deleted from the tags array', async () => {
    renderWithProviders(<RuleTagFilter selectedTags={['g', 'h']} onChange={onChangeMock} />);
    // Open popover
    fireEvent.click(await screen.findByTestId('ruleTagFilterButton'));

    expect((await screen.findAllByRole('option')).length).toEqual(tags.length + 2);
  });

  it('renders the tag filter with a EuiFilterGroup if isGrouped is false', async () => {
    renderWithProviders(<RuleTagFilter selectedTags={[]} onChange={onChangeMock} />);
    expect(await screen.findByTestId('ruleTagFilterUngrouped')).toBeInTheDocument();
  });

  it('renders the tag filter without EuiFilterGroup if isGrouped is true', async () => {
    renderWithProviders(
      <RuleTagFilter selectedTags={[]} onChange={onChangeMock} isGrouped={true} />
    );
    expect(screen.queryByTestId('ruleTagFilterUngrouped')).not.toBeInTheDocument();
  });
});
