/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mount } from 'enzyme';
import { waitFor } from '@testing-library/react';

import { SummaryViewComponent } from './summary_view';
import { mockAlertDetailsData } from './__mocks__';
import { BrowserFields } from '../../containers/source';
import { TimelineEventsDetailsItem } from '../../../../common/search_strategy';
import { useRuleAsync } from '../../../detections/containers/detection_engine/rules/use_rule_async';

jest.mock('../../../detections/containers/detection_engine/rules/use_rule_async', () => {
  return {
    useRuleAsync: jest.fn(),
  };
});

const props = {
  data: mockAlertDetailsData,
  browserFields: {},
  eventId: '5d1d53da502f56aacc14c3cb5c669363d102b31f99822e5d369d4804ed370a31',
  timelineId: 'detections-page',
} as {
  browserFields: BrowserFields;
  data: TimelineEventsDetailsItem[];
  eventId: string;
  timelineId: string;
};

describe('SummaryViewComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRuleAsync as jest.Mock).mockReturnValue({
      rule: {
        note: 'investigation guide',
      },
    });
  });
  test('render correct items', () => {
    const wrapper = mount(<SummaryViewComponent {...props} />);
    expect(wrapper.find('[data-test-subj="summary-view"]').exists()).toEqual(true);
  });

  test('render investigation guide', async () => {
    const wrapper = mount(<SummaryViewComponent {...props} />);
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
    const wrapper = mount(<SummaryViewComponent {...props} />);
    await waitFor(() => {
      expect(wrapper.find('[data-test-subj="summary-view-guide"]').exists()).toEqual(false);
    });
  });
});
