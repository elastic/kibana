/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { ExecutionLogSearchBar } from './execution_log_search_bar';
import { noop } from 'lodash/fp';

/**
 * NOTE: This component is currently not shown in the UI as custom search queries
 * are not yet fully supported by the Rule Execution Log aggregation API since
 * certain queries could result in missing data or inclusion of wrong events.
 * Please see this comment for history/details: https://github.com/elastic/kibana/pull/127339/files#r825240516
 *
 * Not expanding test coverage until component is complete/in-use.
 */

describe('ExecutionLogSearchBar', () => {
  describe('snapshots', () => {
    test('renders correctly against snapshot', () => {
      const wrapper = shallow(
        <ExecutionLogSearchBar
          onlyShowFilters={true}
          selectedStatuses={[]}
          onStatusFilterChange={noop}
          onSearch={noop}
        />
      );
      expect(wrapper).toMatchSnapshot();
    });
  });
});
