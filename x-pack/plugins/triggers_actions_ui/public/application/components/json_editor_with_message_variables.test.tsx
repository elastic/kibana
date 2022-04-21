/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { JsonEditorWithMessageVariables } from './json_editor_with_message_variables';
import { MockCodeEditor } from '../code_editor.mock';

const kibanaReactPath = '../../../../../../src/plugins/kibana_react/public';

jest.mock(kibanaReactPath, () => {
  const original = jest.requireActual(kibanaReactPath);
  return {
    ...original,
    CodeEditor: (props: any) => {
      return <MockCodeEditor {...props} />;
    },
  };
});

describe('JsonEditorWithMessageVariables', () => {
  const onDocumentsChange = jest.fn();
  const props = {
    messageVariables: [
      {
        name: 'myVar',
        description: 'My variable description',
      },
    ],
    paramsProperty: 'foo',
    label: 'label',
    onDocumentsChange,
  };

  beforeEach(() => jest.resetAllMocks());

  test('renders variables with double braces by default', () => {
    const wrapper = mountWithIntl(<JsonEditorWithMessageVariables {...props} />);

    wrapper.find('[data-test-subj="fooAddVariableButton"]').first().simulate('click');
    wrapper
      .find('[data-test-subj="variableMenuButton-0-templated-name"]')
      .first()
      .simulate('click');

    expect(wrapper.find('[data-test-subj="fooJsonEditor"]').first().prop('value')).toEqual(
      '{{myVar}}'
    );
  });

  test('renders variables with triple braces when specified', () => {
    const wrapper = mountWithIntl(
      <JsonEditorWithMessageVariables
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

    expect(wrapper.find('[data-test-subj="fooJsonEditor"]').first().prop('value')).toEqual(
      '{{{myVar}}}'
    );
  });
});
