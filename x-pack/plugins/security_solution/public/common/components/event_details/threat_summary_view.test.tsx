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
import { mockAlertDetailsData } from './__mocks__';
import { TimelineEventsDetailsItem } from '../../../../common/search_strategy';

jest.mock('../../../detections/containers/detection_engine/rules/use_rule_async', () => {
  return {
    useRuleAsync: jest.fn(),
  };
});

const props = {
  data: mockAlertDetailsData as TimelineEventsDetailsItem[],
  eventId: '5d1d53da502f56aacc14c3cb5c669363d102b31f99822e5d369d4804ed370a31',
  timelineId: 'detections-page',
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
