/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { act } from '@testing-library/react';
import ParamsFields from './es_index_params';
import { AlertHistoryEsIndexConnectorId } from '../../../../types';
import { MockCodeEditor } from '../../../code_editor.mock';

const kibanaReactPath = '../../../../../../../../src/plugins/kibana_react/public';

jest.mock('../../../../common/lib/kibana');

jest.mock(kibanaReactPath, () => {
  const original = jest.requireActual(kibanaReactPath);
  return {
    ...original,
    CodeEditor: (props: any) => {
      return <MockCodeEditor {...props} />;
    },
  };
});

const actionConnector = {
  actionTypeId: '.index',
  config: {
    index: 'test-index',
  },
  id: 'es index connector',
  isPreconfigured: false,
  isDeprecated: false,
  name: 'test name',
  secrets: {},
};

const preconfiguredActionConnector = {
  actionTypeId: '.index',
  config: {
    index: 'kibana-alert-history-default',
  },
  id: AlertHistoryEsIndexConnectorId,
  isPreconfigured: true,
  isDeprecated: false,
  name: 'Alert history Elasticsearch index',
  secrets: {},
};

describe('IndexParamsFields renders', () => {
  test('all params fields are rendered correctly when params are undefined', () => {
    const actionParams = {
      documents: undefined,
    };
    const wrapper = mountWithIntl(
      <ParamsFields
        actionParams={actionParams}
        errors={{ index: [] }}
        editAction={() => {}}
        index={0}
        actionConnector={actionConnector}
        messageVariables={[
          {
            name: 'myVar',
            description: 'My variable description',
            useWithTripleBracesInTemplates: true,
          },
        ]}
      />
    );
    expect(wrapper.find('[data-test-subj="documentsJsonEditor"]').first().prop('value')).toBe(``);
    expect(wrapper.find('[data-test-subj="documentsAddVariableButton"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="preconfiguredIndexToUse"]').length > 0).toBeFalsy();
    expect(wrapper.find('[data-test-subj="preconfiguredDocumentToIndex"]').length > 0).toBeFalsy();
  });

  test('all params fields are rendered when document params are defined', () => {
    const actionParams = {
      documents: [{ test: 123 }],
    };

    const wrapper = mountWithIntl(
      <ParamsFields
        actionParams={actionParams}
        errors={{ index: [] }}
        editAction={() => {}}
        index={0}
        actionConnector={actionConnector}
        messageVariables={[
          {
            name: 'myVar',
            description: 'My variable description',
            useWithTripleBracesInTemplates: true,
          },
        ]}
      />
    );
    expect(wrapper.find('[data-test-subj="documentsJsonEditor"]').first().prop('value')).toBe(`{
  "test": 123
}`);
    expect(wrapper.find('[data-test-subj="documentsAddVariableButton"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="preconfiguredIndexToUse"]').length > 0).toBeFalsy();
    expect(wrapper.find('[data-test-subj="preconfiguredDocumentToIndex"]').length > 0).toBeFalsy();
  });

  test('all params fields are rendered correctly for preconfigured alert history connector when params are undefined', () => {
    const actionParams = {
      documents: undefined,
    };
    const wrapper = mountWithIntl(
      <ParamsFields
        actionParams={actionParams}
        errors={{ index: [] }}
        editAction={() => {}}
        index={0}
        actionConnector={preconfiguredActionConnector}
        messageVariables={[
          {
            name: 'myVar',
            description: 'My variable description',
            useWithTripleBracesInTemplates: true,
          },
        ]}
      />
    );
    expect(wrapper.find('[data-test-subj="documentsJsonEditor"]').length > 0).toBeFalsy();
    expect(wrapper.find('[data-test-subj="documentsAddVariableButton"]').length > 0).toBeFalsy();
    expect(wrapper.find('[data-test-subj="preconfiguredIndexToUse"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="preconfiguredIndexToUse"]').first().prop('value')).toBe(
      'default'
    );
    expect(wrapper.find('[data-test-subj="preconfiguredDocumentToIndex"]').length > 0).toBeTruthy();
  });

  test('all params fields are rendered correctly for preconfigured alert history connector when params are defined', async () => {
    const actionParams = {
      documents: undefined,
      indexOverride: 'kibana-alert-history-not-the-default',
    };
    const wrapper = mountWithIntl(
      <ParamsFields
        actionParams={actionParams}
        errors={{ index: [] }}
        editAction={() => {}}
        index={0}
        actionConnector={preconfiguredActionConnector}
        messageVariables={[
          {
            name: 'myVar',
            description: 'My variable description',
            useWithTripleBracesInTemplates: true,
          },
        ]}
      />
    );
    expect(wrapper.find('[data-test-subj="documentsJsonEditor"]').length > 0).toBeFalsy();
    expect(wrapper.find('[data-test-subj="documentsAddVariableButton"]').length > 0).toBeFalsy();
    expect(wrapper.find('[data-test-subj="preconfiguredIndexToUse"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="preconfiguredIndexToUse"]').first().prop('value')).toBe(
      'not-the-default'
    );
    expect(wrapper.find('[data-test-subj="preconfiguredDocumentToIndex"]').length > 0).toBeTruthy();

    wrapper.find('EuiLink[data-test-subj="resetDefaultIndex"]').simulate('click');
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('[data-test-subj="preconfiguredIndexToUse"]').first().prop('value')).toBe(
      'default'
    );
  });
});
