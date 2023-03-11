/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import WebhookParamsFields from './webhook_params';
import { MockCodeEditor } from '@kbn/triggers-actions-ui-plugin/public/application/code_editor.mock';
import { CasesWebhookActionConnector } from './types';

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

const actionParams = {
  subAction: 'pushToService',
  subActionParams: {
    incident: {
      title: 'sn title',
      description: 'some description',
      tags: ['kibana'],
      externalId: null,
    },
    comments: [],
  },
};

const actionConnector = {
  config: {
    createCommentUrl: 'https://elastic.co',
    createCommentJson: {},
  },
} as unknown as CasesWebhookActionConnector;

describe('WebhookParamsFields renders', () => {
  test('all params fields is rendered', () => {
    const wrapper = mountWithIntl(
      <WebhookParamsFields
        actionConnector={actionConnector}
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
    expect(wrapper.find('[data-test-subj="titleInput"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="descriptionTextArea"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="tagsComboBox"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="commentsTextArea"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="commentsTextArea"]').first().prop('disabled')).toEqual(
      false
    );
  });
  test('comments field is disabled when comment data is missing', () => {
    const actionConnectorNoComments = {
      config: {},
    } as unknown as CasesWebhookActionConnector;
    const wrapper = mountWithIntl(
      <WebhookParamsFields
        actionConnector={actionConnectorNoComments}
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
    expect(wrapper.find('[data-test-subj="commentsTextArea"]').first().prop('disabled')).toEqual(
      true
    );
  });
});
