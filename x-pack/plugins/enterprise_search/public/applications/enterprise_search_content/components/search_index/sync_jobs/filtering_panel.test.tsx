/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import {
  FilteringPolicy,
  FilteringRule,
  FilteringRuleRule,
} from '../../../../../../common/types/connectors';

import { FilteringPanel } from './filtering_panel';

describe('FilteringPanel', () => {
  const filteringRules = [
    {
      order: 1,
      policy: FilteringPolicy.EXCLUDE,
      rule: FilteringRuleRule.CONTAINS,
      value: 'THIS VALUE',
    },
    {
      order: 2,
      policy: FilteringPolicy.EXCLUDE,
      rule: FilteringRuleRule.ENDS_WITH,
      value: 'THIS VALUE',
    },
    {
      order: 0,
      policy: FilteringPolicy.INCLUDE,
      rule: FilteringRuleRule.EQUALS,
      value: 'THIS VALUE',
    },
    {
      order: 5,
      policy: FilteringPolicy.INCLUDE,
      rule: FilteringRuleRule.GT,
      value: 'THIS VALUE',
    },
    {
      order: 4,
      policy: FilteringPolicy.EXCLUDE,
      rule: FilteringRuleRule.LT,
      value: 'THIS VALUE',
    },
  ] as FilteringRule[];

  it('renders', () => {
    const wrapper = shallow(<FilteringPanel filteringRules={[]} />);

    expect(wrapper).toMatchSnapshot();
  });
  it('renders filtering rules list', () => {
    const wrapper = shallow(<FilteringPanel filteringRules={filteringRules} />);

    expect(wrapper).toMatchSnapshot();
  });
  it('renders advanced snippet', () => {
    const wrapper = shallow(
      <FilteringPanel
        advancedSnippet={{
          created_at: 'whatever',
          updated_at: 'sometime',
          value: { one: 'two', three: 'four' },
        }}
        filteringRules={filteringRules}
      />
    );

    expect(wrapper).toMatchSnapshot();
  });
});
