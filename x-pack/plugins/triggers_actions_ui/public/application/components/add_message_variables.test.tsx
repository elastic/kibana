/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { AddMessageVariables } from './add_message_variables';

describe('AddMessageVariables', () => {
  test('renders variables with double brances by default', () => {
    const onSelectEventHandler = jest.fn();
    const wrapper = mountWithIntl(
      <AddMessageVariables
        messageVariables={[
          {
            name: 'myVar',
            description: 'My variable description',
          },
        ]}
        paramsProperty="foo"
        onSelectEventHandler={onSelectEventHandler}
      />
    );

    wrapper.find('[data-test-subj="fooAddVariableButton"]').first().simulate('click');
    expect(wrapper.find('[data-test-subj="messageVariablesSelectableList"]')).toBeTruthy();
    expect(wrapper.find('[data-test-subj="myVar-selectableOption"]').last().text()).toEqual(
      'myVarMy variable description'
    );
  });

  test('renders variables with tripple braces when specified', () => {
    const onSelectEventHandler = jest.fn();
    const wrapper = mountWithIntl(
      <AddMessageVariables
        messageVariables={[
          {
            name: 'myVar',
            description: 'My variable description',
            useWithTripleBracesInTemplates: true,
          },
        ]}
        paramsProperty="foo"
        onSelectEventHandler={onSelectEventHandler}
      />
    );

    wrapper.find('[data-test-subj="fooAddVariableButton"]').first().simulate('click');

    expect(wrapper.find('[data-test-subj="myVar-selectableOption"]').last().text()).toEqual(
      'myVarMy variable description'
    );
  });

  test('onSelectEventHandler is called with proper action variable', () => {
    const onSelectEventHandler = jest.fn();
    const wrapper = mountWithIntl(
      <AddMessageVariables
        messageVariables={[
          {
            name: 'myVar1',
            description: 'My variable 1 description',
            useWithTripleBracesInTemplates: true,
          },
          {
            name: 'myVar2',
            description: 'My variable 2 description',
            useWithTripleBracesInTemplates: true,
          },
        ]}
        paramsProperty="foo"
        onSelectEventHandler={onSelectEventHandler}
      />
    );

    wrapper.find('[data-test-subj="fooAddVariableButton"]').first().simulate('click');
    wrapper.find('[data-test-subj="myVar2-selectableOption"]').last().simulate('click');

    expect(onSelectEventHandler).toHaveBeenCalledTimes(1);
    expect(onSelectEventHandler).toHaveBeenCalledWith({
      name: 'myVar2',
      description: 'My variable 2 description',
      useWithTripleBracesInTemplates: true,
    });
  });

  test.only('it renders deprecated variables as disabled', () => {
    const wrapper = mountWithIntl(
      <AddMessageVariables
        messageVariables={[
          {
            name: 'myVar',
            description: 'My variable description',
          },
          {
            name: 'deprecatedVar',
            description: 'This variable is deprecated',
            deprecated: true,
          },
        ]}
        paramsProperty="foo"
        onSelectEventHandler={jest.fn()}
      />
    );

    wrapper.find('[data-test-subj="fooAddVariableButton"]').first().simulate('click');
    console.log(wrapper.find('[data-test-subj="deprecatedVar-selectableOption"]').exists());
    // expect(
    //   wrapper.find('button[data-test-subj="myVar-selectableOption"]').last().getDOMNode()
    // ).not.toBeDisabled();
    expect(
      wrapper.find('button[data-test-subj="deprecatedVar-selectableOption"]').at(2).getDOMNode()
    ).toBeDisabled();
  });

  test(`it does't render when no variables exist`, () => {
    const wrapper = mountWithIntl(
      <AddMessageVariables
        messageVariables={[]}
        paramsProperty="foo"
        onSelectEventHandler={jest.fn()}
      />
    );

    expect(wrapper.find('[data-test-subj="fooAddVariableButton"]')).toHaveLength(0);
  });

  test('it renders button title when passed', () => {
    const wrapper = mountWithIntl(
      <AddMessageVariables
        messageVariables={[
          {
            name: 'myVar',
            description: 'My variable description',
          },
        ]}
        paramsProperty="foo"
        onSelectEventHandler={jest.fn()}
        showButtonTitle
      />
    );

    expect(wrapper.find('[data-test-subj="fooAddVariableButton-Title"]').exists()).toEqual(true);
  });
});
