/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow, mount } from 'enzyme';

import '../../../common/mock/match_media';
import { AlertsCount } from './alerts_count';
import { alertsMock } from '../../containers/detection_engine/alerts/mock';
import { AlertSearchResponse } from '../../containers/detection_engine/alerts/types';
import { AlertsAggregation } from './types';
import { TestProviders } from '../../../common/mock';
import { DragDropContextWrapper } from '../../../common/components/drag_and_drop/drag_drop_context_wrapper';
import { mockBrowserFields } from '../../../common/containers/source/mock';

jest.mock('../../../common/lib/kibana');
const mockDispatch = jest.fn();

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
        data={alertsMock as AlertSearchResponse<unknown, AlertsAggregation>}
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
      ...alertsMock,
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
    } as AlertSearchResponse<unknown, AlertsAggregation>;

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
