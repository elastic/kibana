/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
import { shallow } from 'enzyme';

import '../../../../common/mock/match_media';
import { AllRulesTables } from './index';
import { AllRulesTabs } from '../../../pages/detection_engine/rules/all';

describe('AllRulesTables', () => {
  it('renders correctly', () => {
    const Component = () => {
      const ref = useRef(null);

      return (
        <AllRulesTables
          selectedTab={AllRulesTabs.rules}
          euiBasicTableSelectionProps={{}}
          hasPermissions
          monitoringColumns={[]}
          rules={[]}
          rulesColumns={[]}
          rulesStatuses={[]}
          tableOnChangeCallback={jest.fn()}
          tableRef={ref}
          pagination={{
            pageIndex: 0,
            pageSize: 0,
            totalItemCount: 0,
            pageSizeOptions: [0],
          }}
          sorting={{
            sort: {
              field: 'enabled',
              direction: 'asc',
            },
          }}
        />
      );
    };
    const wrapper = shallow(<Component />);

    expect(wrapper.dive().find('[data-test-subj="rules-table"]')).toHaveLength(1);
  });

  it('renders rules tab when "selectedTab" is "rules"', () => {
    const Component = () => {
      const ref = useRef(null);

      return (
        <AllRulesTables
          selectedTab={AllRulesTabs.rules}
          euiBasicTableSelectionProps={{}}
          hasPermissions
          monitoringColumns={[]}
          rules={[]}
          rulesColumns={[]}
          rulesStatuses={[]}
          tableOnChangeCallback={jest.fn()}
          tableRef={ref}
          pagination={{
            pageIndex: 0,
            pageSize: 0,
            totalItemCount: 0,
            pageSizeOptions: [0],
          }}
          sorting={{
            sort: {
              field: 'enabled',
              direction: 'asc',
            },
          }}
        />
      );
    };
    const wrapper = shallow(<Component />);

    expect(wrapper.dive().find('[data-test-subj="rules-table"]')).toHaveLength(1);
    expect(wrapper.dive().find('[data-test-subj="monitoring-table"]')).toHaveLength(0);
  });

  it('renders monitoring tab when "selectedTab" is "monitoring"', () => {
    const Component = () => {
      const ref = useRef(null);

      return (
        <AllRulesTables
          selectedTab={AllRulesTabs.monitoring}
          euiBasicTableSelectionProps={{}}
          hasPermissions
          monitoringColumns={[]}
          rules={[]}
          rulesColumns={[]}
          rulesStatuses={[]}
          tableOnChangeCallback={jest.fn()}
          tableRef={ref}
          pagination={{
            pageIndex: 0,
            pageSize: 0,
            totalItemCount: 0,
            pageSizeOptions: [0],
          }}
          sorting={{
            sort: {
              field: 'enabled',
              direction: 'asc',
            },
          }}
        />
      );
    };
    const wrapper = shallow(<Component />);

    expect(wrapper.dive().find('[data-test-subj="rules-table"]')).toHaveLength(0);
    expect(wrapper.dive().find('[data-test-subj="monitoring-table"]')).toHaveLength(1);
  });
});
