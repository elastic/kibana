/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';

import { OverviewHostProps } from '../../../components/page/overview/overview_host';
import { OverviewNetworkProps } from '../../../components/page/overview/overview_network';
import { mockIndexPattern, TestProviders } from '../../../mock';

import { EventCounts } from '.';

describe('EventCounts', () => {
  const from = 1579553397080;
  const to = 1579639797080;

  test('it filters the `Host events` widget with a `host.name` `exists` filter', () => {
    const wrapper = mount(
      <TestProviders>
        <EventCounts from={from} indexPattern={mockIndexPattern} setQuery={jest.fn()} to={to} />
      </TestProviders>
    );

    expect(
      (wrapper
        .find('[data-test-subj="overview-host-query"]')
        .first()
        .props() as OverviewHostProps).filterQuery
    ).toContain('[{"bool":{"should":[{"exists":{"field":"host.name"}}]');
  });

  test('it filters the `Network events` widget with a `source.ip` or `destination.ip` `exists` filter', () => {
    const wrapper = mount(
      <TestProviders>
        <EventCounts from={from} indexPattern={mockIndexPattern} setQuery={jest.fn()} to={to} />
      </TestProviders>
    );

    expect(
      (wrapper
        .find('[data-test-subj="overview-network-query"]')
        .first()
        .props() as OverviewNetworkProps).filterQuery
    ).toContain(
      '{"bool":{"filter":[{"bool":{"should":[{"bool":{"should":[{"exists":{"field":"source.ip"}}],"minimum_should_match":1}},{"bool":{"should":[{"exists":{"field":"destination.ip"}}],"minimum_should_match":1}}],"minimum_should_match":1}}]}}]'
    );
  });
});
