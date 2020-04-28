/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { RulesTableFilters } from './rules_table_filters';

describe('RulesTableFilters', () => {
  it('renders correctly', () => {
    const wrapper = shallow(
      <RulesTableFilters onFilterChanged={jest.fn()} rulesCustomInstalled={0} rulesInstalled={0} />
    );

    expect(wrapper.find('[data-test-subj="show-elastic-rules-filter-button"]')).toHaveLength(1);
  });
});
