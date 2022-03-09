/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import WebhookParamsFields from './webhook_params';
import { MockCodeEditor } from '../../../code_editor.mock';

const kibanaReactPath = '../../../../../../../../src/plugins/kibana_react/public';

jest.mock(kibanaReactPath, () => {
  const original = jest.requireActual(kibanaReactPath);
  return {
    ...original,
    CodeEditor: (props: any) => {
      return <MockCodeEditor {...props} />;
    },
  };
});

describe('WebhookParamsFields renders', () => {
  test('all params fields is rendered', () => {
    const actionParams = {
      body: 'test message',
    };

    const wrapper = mountWithIntl(
      <WebhookParamsFields
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
    expect(wrapper.find('[data-test-subj="bodyJsonEditor"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="bodyJsonEditor"]').first().prop('value')).toStrictEqual(
      'test message'
    );
    expect(wrapper.find('[data-test-subj="bodyAddVariableButton"]').length > 0).toBeTruthy();
  });
});
