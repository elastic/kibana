/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
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

    expect(
      wrapper.find('[data-test-subj="variableMenuButton-0-templated-name"]').first().text()
    ).toEqual('{{myVar}}');
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

    expect(
      wrapper.find('[data-test-subj="variableMenuButton-0-templated-name"]').first().text()
    ).toEqual('{{{myVar}}}');
  });

  test('onSelectEventHandler is called with proper action variable', () => {
    const onSelectEventHandler = jest.fn();
    const wrapper = mountWithIntl(
      <AddMessageVariables
        messageVariables={[
          {
            name: 'myVar1',
            description: 'My variable 1 description',
          },
          {
            name: 'myVar2',
            description: 'My variable 1 description',
            useWithTripleBracesInTemplates: true,
          },
        ]}
        paramsProperty="foo"
        onSelectEventHandler={onSelectEventHandler}
      />
    );

    wrapper.find('[data-test-subj="fooAddVariableButton"]').first().simulate('click');
    wrapper
      .find('[data-test-subj="variableMenuButton-1-templated-name"]')
      .first()
      .simulate('click');

    expect(onSelectEventHandler).toHaveBeenCalledTimes(1);
    expect(onSelectEventHandler).toHaveBeenCalledWith({
      name: 'myVar2',
      description: 'My variable 1 description',
      useWithTripleBracesInTemplates: true,
    });
  });
});
