/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { ThreatDetailsView } from './threat_details_view';

import { TestProviders } from '../../mock';
import { useMountAppended } from '../../utils/use_mount_appended';

jest.mock('../../../detections/containers/detection_engine/rules/use_rule_async', () => {
  return {
    useRuleAsync: jest.fn(),
  };
});

const mostRecentDate = '2021-04-25T18:17:00.000Z';

const threatData = [
  [
    {
      category: 'matched',
      field: 'matched.field',
      isObjectArray: false,
      originalValue: ['test_field_2'],
      values: ['test_field_2'],
    },
    {
      category: 'first_seen',
      field: 'first_seen',
      isObjectArray: false,
      originalValue: ['2019-04-25T18:17:00.000Z'],
      values: ['2019-04-25T18:17:00.000Z'],
    },
    {
      category: 'event',
      field: 'event.reference',
      isObjectArray: false,
      originalValue: ['https://test.com/'],
      values: ['https://test.com/'],
    },
    {
      category: 'event',
      field: 'event.url',
      isObjectArray: false,
      originalValue: ['https://test2.com/'],
      values: ['https://test2.com/'],
    },
  ],
  [
    {
      category: 'first_seen',
      field: 'first_seen',
      isObjectArray: false,
      originalValue: [mostRecentDate],
      values: [mostRecentDate],
    },
    {
      category: 'matched',
      field: 'matched.field',
      isObjectArray: false,
      originalValue: ['test_field'],
      values: ['test_field'],
    },
  ],
];

describe('ThreatDetailsView', () => {
  const mount = useMountAppended();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('render correct items', () => {
    const wrapper = mount(
      <TestProviders>
        <ThreatDetailsView threatData={threatData} />
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="threat-details-view-0"]').exists()).toEqual(true);
  });

  test('renders empty view if there are no items', () => {
    const wrapper = mount(
      <TestProviders>
        <ThreatDetailsView threatData={[[]]} />
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="empty-threat-details-view"]').exists()).toEqual(true);
  });

  test('renders link for event.url and event.reference', () => {
    const wrapper = mount(
      <TestProviders>
        <ThreatDetailsView threatData={threatData} />
      </TestProviders>
    );
    expect(wrapper.find('a').length).toEqual(2);
  });

  test('orders items by first_seen', () => {
    const wrapper = mount(
      <TestProviders>
        <ThreatDetailsView threatData={threatData} />
      </TestProviders>
    );
    expect(wrapper.find('.euiToolTipAnchor span').at(0).text()).toEqual(mostRecentDate);
  });
});
