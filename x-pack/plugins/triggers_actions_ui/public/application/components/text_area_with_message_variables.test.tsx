/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { TextAreaWithMessageVariables } from './text_area_with_message_variables';

describe('TextAreaWithMessageVariables', () => {
  const editAction = jest.fn();
  const props = {
    messageVariables: [
      {
        name: 'myVar',
        description: 'My variable description',
      },
    ],
    paramsProperty: 'foo',
    index: 0,
    editAction,
    label: 'label',
  };

  beforeEach(() => jest.resetAllMocks());

  test('renders variables with double braces by default', () => {
    const wrapper = mountWithIntl(<TextAreaWithMessageVariables {...props} />);

    wrapper.find('[data-test-subj="fooAddVariableButton"]').first().simulate('click');
    wrapper
      .find('[data-test-subj="variableMenuButton-0-templated-name"]')
      .first()
      .simulate('click');

    expect(editAction).toHaveBeenCalledTimes(1);
    expect(editAction).toHaveBeenCalledWith(props.paramsProperty, '{{myVar}}', props.index);
  });

  test('renders variables with triple braces when specified', () => {
    const wrapper = mountWithIntl(
      <TextAreaWithMessageVariables
        {...props}
        messageVariables={[
          {
            name: 'myVar',
            description: 'My variable description',
            useWithTripleBracesInTemplates: true,
          },
        ]}
      />
    );

    wrapper.find('[data-test-subj="fooAddVariableButton"]').first().simulate('click');
    wrapper
      .find('[data-test-subj="variableMenuButton-0-templated-name"]')
      .first()
      .simulate('click');

    expect(editAction).toHaveBeenCalledTimes(1);
    expect(editAction).toHaveBeenCalledWith(props.paramsProperty, '{{{myVar}}}', props.index);
  });
});
