/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import GenerativeAiParamsFields from './params';
import { MockCodeEditor } from '@kbn/triggers-actions-ui-plugin/public/application/code_editor.mock';

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

describe('Gen AI Params Fields renders', () => {
  test('all params fields are rendered', () => {
    const actionParams = {
      body: 'test message',
    };

    const { getAllByTestId } = render(
      <GenerativeAiParamsFields
        actionParams={actionParams}
        errors={{ body: [] }}
        editAction={() => {}}
        index={0}
        messageVariables={[
          {
            name: 'myVar',
            description: 'My variable description',
            useWithTripleBracesInTemplates: true,
          },
        ]}
      />
    );
    expect(getAllByTestId('bodyJsonEditor')[0]).toBeInTheDocument();
    expect(getAllByTestId('bodyJsonEditor')[0]).toHaveProperty('value', 'test message');
    expect(getAllByTestId('bodyAddVariableButton')[0]).toBeInTheDocument();
  });
});
