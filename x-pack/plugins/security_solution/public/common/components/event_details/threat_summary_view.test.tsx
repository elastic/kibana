/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { ThreatSummaryView } from './threat_summary_view';
import { TestProviders } from '../../mock';
import { useMountAppended } from '../../utils/use_mount_appended';

jest.mock('../../../detections/containers/detection_engine/rules/use_rule_async', () => {
  return {
    useRuleAsync: jest.fn(),
  };
});

const props = {
  threatSummaryRows: [
    {
      title: 'matched.field',
      index: 0,
      description: {
        contextId: 'test-context-id',
        eventId: 'test-event-id',
        fieldName: 'threat.indicator.matched.field',
        values: ['ip'],
      },
    },
    {
      title: 'matched.type',
      index: 1,
      description: {
        contextId: 'test-context-id',
        eventId: 'test-event-id',
        fieldName: 'threat.indicator.matched.type',
        values: ['file'],
      },
    },
  ],
};

describe('ThreatSummaryView', () => {
  const mount = useMountAppended();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('render correct items', () => {
    const wrapper = mount(
      <TestProviders>
        <ThreatSummaryView {...props} />
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="threat-summary-view"]').exists()).toEqual(true);
  });
});
