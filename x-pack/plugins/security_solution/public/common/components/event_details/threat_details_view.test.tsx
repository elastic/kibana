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

const mockThreatDetailsRows = [
  [
    {
      title: 'matched.field',
      description: {
        fieldName: 'threat.indicator.matched.field',
        value: 'ip',
      },
    },
    {
      title: 'matched.type',
      description: {
        fieldName: 'threat.indicator.matched.type',
        value: 'file',
      },
    },
  ],
  [
    {
      title: 'matched.field',
      description: {
        fieldName: 'threat.indicator.matched.field',
        value: 'ip',
      },
    },
    {
      title: 'matched.type',
      description: {
        fieldName: 'threat.indicator.matched.type',
        value: 'file',
      },
    },
  ],
  [
    {
      title: 'event.url',
      description: {
        fieldName: 'threat.indicator.event.url',
        value: 'https://test.com',
      },
    },
    {
      title: 'event.reference',
      description: {
        fieldName: 'threat.indicator.event.reference',
        value: 'https://othertest.com',
      },
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
        <ThreatDetailsView threatDetailsRows={mockThreatDetailsRows} />
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="threat-details-view-0"]').exists()).toEqual(true);
  });

  test('renders empty view if there are no items', () => {
    const wrapper = mount(
      <TestProviders>
        <ThreatDetailsView threatDetailsRows={[[]]} />
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="empty-threat-details-view"]').exists()).toEqual(true);
  });

  test('renders link for event.url and event.reference', () => {
    const wrapper = mount(
      <TestProviders>
        <ThreatDetailsView threatDetailsRows={mockThreatDetailsRows} />
      </TestProviders>
    );
    expect(wrapper.find('a').length).toEqual(2);
  });
});
