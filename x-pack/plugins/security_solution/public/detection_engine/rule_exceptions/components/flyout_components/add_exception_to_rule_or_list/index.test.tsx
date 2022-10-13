/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { getRulesSchemaMock } from '../../../../../../common/detection_engine/schemas/response/rules_schema.mocks';
import type { Rule } from '../../../../rule_management/logic/types';

import { ExceptionsAddToRulesOrLists } from '.';

describe('ExceptionsAddToRulesOrLists', () => {
  it('it passes empty array for shared lists attached if no rules passed in', () => {
    const wrapper = shallow(
      <ExceptionsAddToRulesOrLists
        rules={null}
        isBulkAction={false}
        selectedRadioOption="add_to_rule"
        onListSelectionChange={jest.fn()}
        onRuleSelectionChange={jest.fn()}
        onRadioChange={jest.fn()}
      />
    );

    expect(wrapper.find('ExceptionsAddToListsOptions').prop('sharedLists')).toEqual([]);
    expect(wrapper.find('ExceptionsAddToListsOptions').prop('rulesCount')).toEqual(0);
  });

  it('it passes all shared lists attached to a single rule', () => {
    const wrapper = shallow(
      <ExceptionsAddToRulesOrLists
        rules={[
          {
            ...getRulesSchemaMock(),
            exceptions_list: [
              { id: '123', list_id: 'my_list', namespace_type: 'single', type: 'detection' },
            ],
          } as Rule,
        ]}
        isBulkAction={false}
        selectedRadioOption="add_to_rule"
        onListSelectionChange={jest.fn()}
        onRuleSelectionChange={jest.fn()}
        onRadioChange={jest.fn()}
      />
    );

    expect(wrapper.find('ExceptionsAddToListsOptions').prop('sharedLists')).toEqual([
      { id: '123', list_id: 'my_list', namespace_type: 'single', type: 'detection' },
    ]);
  });

  it('it passes shared lists that are in common if multiple rules exist', () => {
    const wrapper = shallow(
      <ExceptionsAddToRulesOrLists
        rules={[
          {
            ...getRulesSchemaMock(),
            exceptions_list: [
              { id: '123', list_id: 'my_list', namespace_type: 'single', type: 'detection' },
            ],
          } as Rule,
          {
            ...getRulesSchemaMock(),
            id: '2',
            rule_id: '2',
            exceptions_list: [
              { id: '123', list_id: 'my_list', namespace_type: 'single', type: 'detection' },
              { id: '456', list_id: 'my_list_2', namespace_type: 'single', type: 'detection' },
              { id: '789', list_id: 'my_list_3', namespace_type: 'single', type: 'detection' },
            ],
          } as Rule,
          {
            ...getRulesSchemaMock(),
            id: '3',
            rule_id: '3',
            exceptions_list: [
              { id: '123', list_id: 'my_list', namespace_type: 'single', type: 'detection' },
              { id: '789', list_id: 'my_list_3', namespace_type: 'single', type: 'detection' },
            ],
          } as Rule,
        ]}
        isBulkAction={false}
        selectedRadioOption="add_to_rule"
        onListSelectionChange={jest.fn()}
        onRuleSelectionChange={jest.fn()}
        onRadioChange={jest.fn()}
      />
    );

    expect(wrapper.find('ExceptionsAddToListsOptions').prop('sharedLists')).toEqual([
      { id: '123', list_id: 'my_list', namespace_type: 'single', type: 'detection' },
    ]);
  });

  it('it passes an empty array for shared lists if multiple rules exist and they have no shared lists in common', () => {
    const wrapper = shallow(
      <ExceptionsAddToRulesOrLists
        rules={[
          {
            ...getRulesSchemaMock(),
            exceptions_list: [
              { id: '123', list_id: 'my_list', namespace_type: 'single', type: 'detection' },
            ],
          } as Rule,
          {
            ...getRulesSchemaMock(),
            id: '2',
            rule_id: '2',
            exceptions_list: [
              { id: '456', list_id: 'my_list_2', namespace_type: 'single', type: 'detection' },
              { id: '789', list_id: 'my_list_3', namespace_type: 'single', type: 'detection' },
            ],
          } as Rule,
          {
            ...getRulesSchemaMock(),
            id: '3',
            rule_id: '3',
            exceptions_list: [
              { id: '123', list_id: 'my_list', namespace_type: 'single', type: 'detection' },
              { id: '789', list_id: 'my_list_3', namespace_type: 'single', type: 'detection' },
            ],
          } as Rule,
        ]}
        isBulkAction={false}
        selectedRadioOption="add_to_rule"
        onListSelectionChange={jest.fn()}
        onRuleSelectionChange={jest.fn()}
        onRadioChange={jest.fn()}
      />
    );

    expect(wrapper.find('ExceptionsAddToListsOptions').prop('sharedLists')).toEqual([]);
  });
});
