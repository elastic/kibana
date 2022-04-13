/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';

import { AlertsCount } from './alerts_count';
import { AlertSearchResponse } from '../../../containers/detection_engine/alerts/types';
import { TestProviders } from '../../../../common/mock';
import { DragDropContextWrapper } from '../../../../common/components/drag_and_drop/drag_drop_context_wrapper';
import { mockBrowserFields } from '../../../../common/containers/source/mock';
import { AlertsCountAggregation } from './types';

jest.mock('../../../../common/lib/kibana');
const mockDispatch = jest.fn();

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom');
  return { ...actual, useLocation: jest.fn().mockReturnValue({ pathname: '' }) };
});

jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');
  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

describe('AlertsCount', () => {
  it('renders correctly', () => {
    const wrapper = shallow(
      <AlertsCount
        data={{} as AlertSearchResponse<{}, AlertsCountAggregation>}
        loading={false}
        selectedStackByOption={'test_selected_field'}
      />
    );

    expect(wrapper.find('[data-test-subj="alertsCountTable"]').exists()).toBeTruthy();
  });

  it('renders the given alert item', () => {
    const alertFiedlKey = 'test_stack_by_test_key';
    const alertFiedlCount = 999;
    const alertData = {
      took: 0,
      timeout: false,
      hits: {
        hits: [],
        sequences: [],
        events: [],
        total: {
          relation: 'eq',
          value: 0,
        },
      },
      _shards: {
        failed: 0,
        skipped: 0,
        successful: 1,
        total: 1,
      },
      aggregations: {
        alertsByGroupingCount: {
          buckets: [
            {
              key: alertFiedlKey,
              doc_count: alertFiedlCount,
            },
          ],
        },
        alertsByGrouping: { buckets: [] },
      },
    } as AlertSearchResponse<unknown, AlertsCountAggregation>;

    const wrapper = mount(
      <TestProviders>
        <DragDropContextWrapper browserFields={mockBrowserFields}>
          <AlertsCount
            data={alertData}
            loading={false}
            selectedStackByOption={'test_selected_field'}
          />
        </DragDropContextWrapper>
      </TestProviders>
    );

    expect(wrapper.text()).toContain(alertFiedlKey);
    expect(wrapper.text()).toContain(alertFiedlCount);
  });
});
