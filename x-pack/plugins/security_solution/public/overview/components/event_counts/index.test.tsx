/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount, type ComponentType as EnzymeComponentType } from 'enzyme';
import React from 'react';

import type { OverviewHostProps } from '../overview_host';
import type { OverviewNetworkProps } from '../overview_network';
import { mockIndexPattern, TestProviders } from '../../../common/mock';

import { EventCounts } from '.';

jest.mock('../../../common/components/link_to');

describe('EventCounts', () => {
  const from = '2020-01-20T20:49:57.080Z';
  const to = '2020-01-21T20:49:57.080Z';

  const testProps = {
    filters: [],
    from,
    indexNames: [],
    indexPattern: mockIndexPattern,
    setQuery: jest.fn(),
    to,
    query: {
      query: '',
      language: 'kuery',
    },
  };

  test('it filters the `Host events` widget with a `host.name` `exists` filter', () => {
    const wrapper = mount(<EventCounts {...testProps} />, {
      wrappingComponent: TestProviders as EnzymeComponentType<{}>,
    });

    expect(
      (wrapper.find('Memo(OverviewHostComponent)').first().props() as OverviewHostProps).filterQuery
    ).toContain('[{"bool":{"should":[{"exists":{"field":"host.name"}}]');
  });

  test('it filters the `Network events` widget with a `source.ip` or `destination.ip` `exists` filter', () => {
    const wrapper = mount(<EventCounts {...testProps} />, {
      wrappingComponent: TestProviders as EnzymeComponentType<{}>,
    });

    expect(
      (wrapper.find('Memo(OverviewNetworkComponent)').first().props() as OverviewNetworkProps)
        .filterQuery
    ).toContain(
      '{"bool":{"must":[],"filter":[{"bool":{"should":[{"exists":{"field":"source.ip"}},{"exists":{"field":"destination.ip"}}],"minimum_should_match":1}}],"should":[],"must_not":[]}}'
    );
  });
});
