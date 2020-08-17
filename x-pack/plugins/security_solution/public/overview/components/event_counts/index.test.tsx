/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';

import { OverviewHostProps } from '../overview_host';
import { OverviewNetworkProps } from '../overview_network';
import { mockIndexPattern, TestProviders } from '../../../common/mock';
import '../../../common/mock/match_media';

import { EventCounts } from '.';

jest.mock('../../../common/components/link_to');

describe('EventCounts', () => {
  const from = '2020-01-20T20:49:57.080Z';
  const to = '2020-01-21T20:49:57.080Z';

  test('it filters the `Host events` widget with a `host.name` `exists` filter', () => {
    const wrapper = mount(
      <TestProviders>
        <EventCounts from={from} indexPattern={mockIndexPattern} setQuery={jest.fn()} to={to} />
      </TestProviders>
    );

    expect(
      (wrapper.find('[data-test-subj="overview-host-query"]').first().props() as OverviewHostProps)
        .filterQuery
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
