/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { RulesTableFilters } from './rules_table_filters';
import { TestProviders } from '../../../../../../common/mock';

jest.mock('../rules_table/rules_table_context');

describe('RulesTableFilters', () => {
  it('renders no numbers next to rule type button filter if none exist', async () => {
    const wrapper = mount(
      <RulesTableFilters rulesCustomInstalled={null} rulesInstalled={null} allTags={[]} />,
      { wrappingComponent: TestProviders }
    );

    expect(wrapper.find('[data-test-subj="showElasticRulesFilterButton"]').at(0).text()).toEqual(
      'Elastic rules'
    );
    expect(wrapper.find('[data-test-subj="showCustomRulesFilterButton"]').at(0).text()).toEqual(
      'Custom rules'
    );
  });

  it('renders number of custom and prepackaged rules', async () => {
    const wrapper = mount(
      <RulesTableFilters rulesCustomInstalled={10} rulesInstalled={9} allTags={[]} />,
      { wrappingComponent: TestProviders }
    );

    expect(wrapper.find('[data-test-subj="showElasticRulesFilterButton"]').at(0).text()).toEqual(
      'Elastic rules (9)'
    );
    expect(wrapper.find('[data-test-subj="showCustomRulesFilterButton"]').at(0).text()).toEqual(
      'Custom rules (10)'
    );
  });
});
