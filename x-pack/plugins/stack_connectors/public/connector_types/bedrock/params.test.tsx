/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import BedrockParamsFields from './params';
import { MockCodeEditor } from '@kbn/triggers-actions-ui-plugin/public/application/code_editor.mock';
import { DEFAULT_BEDROCK_URL, SUB_ACTION } from '../../../common/bedrock/constants';
import { I18nProvider } from '@kbn/i18n-react';

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
const messageVariables = [
  {
    name: 'myVar',
    description: 'My variable description',
    useWithTripleBracesInTemplates: true,
  },
];

describe('Bedrock Params Fields renders', () => {
  test('all params fields are rendered', () => {
    const { getByTestId } = render(
      <BedrockParamsFields
        actionParams={{
          subAction: SUB_ACTION.RUN,
          subActionParams: { body: '{"message": "test"}' },
        }}
        errors={{ body: [] }}
        editAction={() => {}}
        index={0}
        messageVariables={messageVariables}
      />,
      {
        wrapper: ({ children }) => <I18nProvider>{children}</I18nProvider>,
      }
    );
    expect(getByTestId('bodyJsonEditor')).toBeInTheDocument();
    expect(getByTestId('bodyJsonEditor')).toHaveProperty('value', '{"message": "test"}');
    expect(getByTestId('bodyAddVariableButton')).toBeInTheDocument();
    expect(getByTestId('bedrock-model')).toBeInTheDocument();
  });
  test('useEffect handles the case when subAction and subActionParams are undefined', () => {
    const actionParams = {
      subAction: undefined,
      subActionParams: undefined,
    };
    const editAction = jest.fn();
    const errors = {};
    const actionConnector = {
      secrets: {
        accessKey: 'accessKey',
        secret: 'secret',
      },
      id: 'test',
      actionTypeId: '.bedrock',
      isPreconfigured: false,
      isSystemAction: false as const,
      isDeprecated: false,
      name: 'My Bedrock Connector',
      config: {
        apiUrl: DEFAULT_BEDROCK_URL,
      },
    };
    render(
      <BedrockParamsFields
        actionParams={actionParams}
        actionConnector={actionConnector}
        editAction={editAction}
        index={0}
        messageVariables={messageVariables}
        errors={errors}
      />,
      {
        wrapper: ({ children }) => <I18nProvider>{children}</I18nProvider>,
      }
    );
    expect(editAction).toHaveBeenCalledTimes(2);
    expect(editAction).toHaveBeenCalledWith('subAction', SUB_ACTION.RUN, 0);
  });

  it('handles the case when subAction only is undefined', () => {
    const actionParams = {
      subAction: undefined,
      subActionParams: {
        body: '{"key": "value"}',
      },
    };
    const editAction = jest.fn();
    const errors = {};
    render(
      <BedrockParamsFields
        actionParams={actionParams}
        editAction={editAction}
        index={0}
        messageVariables={messageVariables}
        errors={errors}
      />,
      {
        wrapper: ({ children }) => <I18nProvider>{children}</I18nProvider>,
      }
    );
    expect(editAction).toHaveBeenCalledTimes(1);
    expect(editAction).toHaveBeenCalledWith('subAction', SUB_ACTION.RUN, 0);
  });

  it('calls editAction function with the body argument', () => {
    const editAction = jest.fn();
    const errors = {};
    const { getByTestId } = render(
      <BedrockParamsFields
        actionParams={{
          subAction: SUB_ACTION.RUN,
          subActionParams: {
            body: '{"key": "value"}',
          },
        }}
        editAction={editAction}
        index={0}
        messageVariables={messageVariables}
        errors={errors}
      />,
      {
        wrapper: ({ children }) => <I18nProvider>{children}</I18nProvider>,
      }
    );
    const jsonEditor = getByTestId('bodyJsonEditor');
    fireEvent.change(jsonEditor, { target: { value: '{"new_key": "new_value"}' } });
    expect(editAction).toHaveBeenCalledWith(
      'subActionParams',
      { body: '{"new_key": "new_value"}' },
      0
    );
  });

  it('calls editAction function with the model argument', () => {
    const editAction = jest.fn();
    const errors = {};
    const { getByTestId } = render(
      <BedrockParamsFields
        actionParams={{
          subAction: SUB_ACTION.RUN,
          subActionParams: {
            body: '{"key": "value"}',
          },
        }}
        editAction={editAction}
        index={0}
        messageVariables={messageVariables}
        errors={errors}
      />,
      {
        wrapper: ({ children }) => <I18nProvider>{children}</I18nProvider>,
      }
    );
    const model = getByTestId('bedrock-model');
    fireEvent.change(model, { target: { value: 'not-the-default' } });
    expect(editAction).toHaveBeenCalledWith(
      'subActionParams',
      { body: '{"key": "value"}', model: 'not-the-default' },
      0
    );
  });
});
