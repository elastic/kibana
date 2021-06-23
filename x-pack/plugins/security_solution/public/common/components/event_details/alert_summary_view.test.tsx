/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor } from '@testing-library/react';

import { AlertSummaryView } from './alert_summary_view';
import { mockAlertDetailsData } from './__mocks__';
import { TimelineEventsDetailsItem } from '../../../../common/search_strategy';
import { useRuleAsync } from '../../../detections/containers/detection_engine/rules/use_rule_async';

import { TestProviders } from '../../mock';
import { mockBrowserFields } from '../../containers/source/mock';
import { useMountAppended } from '../../utils/use_mount_appended';

jest.mock('../../lib/kibana');

jest.mock('../../../detections/containers/detection_engine/rules/use_rule_async', () => {
  return {
    useRuleAsync: jest.fn(),
  };
});

const props = {
  data: mockAlertDetailsData as TimelineEventsDetailsItem[],
  browserFields: mockBrowserFields,
  eventId: '5d1d53da502f56aacc14c3cb5c669363d102b31f99822e5d369d4804ed370a31',
  timelineId: 'detections-page',
};

describe('AlertSummaryView', () => {
  const mount = useMountAppended();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRuleAsync as jest.Mock).mockReturnValue({
      rule: {
        note: 'investigation guide',
      },
    });
  });
  test('render correct items', () => {
    const wrapper = mount(
      <TestProviders>
        <AlertSummaryView {...props} />
      </TestProviders>
    );
    expect(wrapper.find('[data-test-subj="summary-view"]').exists()).toEqual(true);
  });

  test('render investigation guide', async () => {
    const wrapper = mount(
      <TestProviders>
        <AlertSummaryView {...props} />
      </TestProviders>
    );
    await waitFor(() => {
      expect(wrapper.find('[data-test-subj="summary-view-guide"]').exists()).toEqual(true);
    });
  });

  test("render no investigation guide if it doesn't exist", async () => {
    (useRuleAsync as jest.Mock).mockReturnValue({
      rule: {
        note: null,
      },
    });
    const wrapper = mount(
      <TestProviders>
        <AlertSummaryView {...props} />
      </TestProviders>
    );
    await waitFor(() => {
      expect(wrapper.find('[data-test-subj="summary-view-guide"]').exists()).toEqual(false);
    });
  });
});
