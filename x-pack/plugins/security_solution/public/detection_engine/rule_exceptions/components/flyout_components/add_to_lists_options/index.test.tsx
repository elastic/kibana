/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { shallow } from 'enzyme';

import { ExceptionsAddToListsOptions } from '.';

jest.mock('../../../../rule_management/logic/use_find_rules_query');

describe('ExceptionsAddToListsOptions', () => {
  it('it displays radio option as disabled if there are no "sharedLists"', () => {
    const wrapper = shallow(
      <ExceptionsAddToListsOptions
        rulesCount={1}
        selectedRadioOption="add_to_rule"
        sharedLists={[]}
        onListsSelectionChange={jest.fn()}
        onRadioChange={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="exceptionsAddToListTable"]').exists()).toBeFalsy();
    expect(
      wrapper.find('[data-test-subj="addToListsRadioOption"]').at(0).props().disabled
    ).toBeTruthy();
  });

  it('it displays lists table if radio is selected', () => {
    const wrapper = shallow(
      <ExceptionsAddToListsOptions
        rulesCount={1}
        selectedRadioOption="add_to_lists"
        sharedLists={[
          {
            id: '123',
            list_id: 'my_list_id',
            namespace_type: 'single',
            type: ExceptionListTypeEnum.DETECTION,
          },
        ]}
        onListsSelectionChange={jest.fn()}
        onRadioChange={jest.fn()}
      />
    );

    expect(
      wrapper.find('[data-test-subj="addToListsRadioOption"]').at(0).props().disabled
    ).toBeFalsy();
    expect(wrapper.find('[data-test-subj="exceptionsAddToListTable"]').exists()).toBeTruthy();
  });

  it('it does not display lists table if radio is not selected', () => {
    const wrapper = shallow(
      <ExceptionsAddToListsOptions
        rulesCount={1}
        selectedRadioOption="add_to_rule"
        sharedLists={[
          {
            id: '123',
            list_id: 'my_list_id',
            namespace_type: 'single',
            type: ExceptionListTypeEnum.DETECTION,
          },
        ]}
        onListsSelectionChange={jest.fn()}
        onRadioChange={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="exceptionsAddToListTable"]').exists()).toBeFalsy();
  });
});
