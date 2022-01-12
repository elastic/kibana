/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import { JsonEditorWithMessageVariables } from './json_editor_with_message_variables';

const mockEditorInstance = {
  executeEdits: () => {},
  getSelection: () => {},
  getValue: () => {},
  onDidBlurEditorWidget: () => ({
    dispose: () => {},
  }),
};

const MockCodeEditor = (props: any) => {
  const { editorDidMount } = props;
  useEffect(() => {
    editorDidMount(mockEditorInstance);
  }, [editorDidMount]);

  return (
    <input
      data-test-subj={props['data-test-subj'] || 'mockCodeEditor'}
      data-value={props.value}
      value={props.value}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
        props.onChange(e.target.value);
      }}
    />
  );
};

jest.mock('../../../../../../src/plugins/kibana_react/public', () => {
  const original = jest.requireActual('../../../../../../src/plugins/kibana_react/public');
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
