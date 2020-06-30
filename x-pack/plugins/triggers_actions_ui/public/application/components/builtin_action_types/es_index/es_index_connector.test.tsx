/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { mountWithIntl, nextTick } from 'test_utils/enzyme_helpers';
import { act } from 'react-dom/test-utils';
import { EsIndexActionConnector } from '../types';
import { coreMock } from '../../../../../../../../src/core/public/mocks';
import IndexActionConnectorFields from './es_index_connector';
import { TypeRegistry } from '../../../type_registry';
import { DocLinksStart } from 'kibana/public';

jest.mock('../../../../common/index_controls', () => ({
  firstFieldOption: jest.fn(),
  getFields: jest.fn(),
  getIndexOptions: jest.fn(),
  getIndexPatterns: jest.fn(),
}));

describe('IndexActionConnectorFields renders', () => {
  test('all connector fields is rendered', async () => {
    const mocks = coreMock.createSetup();
    const [
      {
        application: { capabilities },
      },
    ] = await mocks.getStartServices();
    const deps = {
      toastNotifications: mocks.notifications.toasts,
      http: mocks.http,
      capabilities: {
        ...capabilities,
        actions: {
          delete: true,
          save: true,
          show: true,
        },
      },
      actionTypeRegistry: {} as TypeRegistry<any>,
      docLinks: { ELASTIC_WEBSITE_URL: '', DOC_LINK_VERSION: '' } as DocLinksStart,
    };

    const { getIndexPatterns } = jest.requireMock('../../../../common/index_controls');
    getIndexPatterns.mockResolvedValueOnce([
      {
        id: 'indexPattern1',
        attributes: {
          title: 'indexPattern1',
        },
      },
      {
        id: 'indexPattern2',
        attributes: {
          title: 'indexPattern2',
        },
      },
    ]);
    const { getFields } = jest.requireMock('../../../../common/index_controls');
    getFields.mockResolvedValueOnce([
      {
        type: 'date',
        name: 'test1',
      },
      {
        type: 'text',
        name: 'test2',
      },
    ]);

    const actionConnector = {
      secrets: {},
      id: 'test',
      actionTypeId: '.index',
      name: 'es_index',
      config: {
        index: 'test',
        refresh: false,
        executionTimeField: 'test1',
      },
    } as EsIndexActionConnector;
    const wrapper = mountWithIntl(
      <IndexActionConnectorFields
        action={actionConnector}
        errors={{ index: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        http={deps!.http}
        docLinks={deps!.docLinks}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('[data-test-subj="connectorIndexesComboBox"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="indexRefreshCheckbox"]').length > 0).toBeTruthy();

    const indexSearchBoxValue = wrapper.find('[data-test-subj="comboBoxSearchInput"]');
    expect(indexSearchBoxValue.first().props().value).toEqual('');

    const indexComboBox = wrapper.find('#indexConnectorSelectSearchBox');
    indexComboBox.first().simulate('click');
    const event = { target: { value: 'indexPattern1' } };
    indexComboBox.find('input').first().simulate('change', event);

    const indexSearchBoxValueBeforeEnterData = wrapper.find(
      '[data-test-subj="comboBoxSearchInput"]'
    );
    expect(indexSearchBoxValueBeforeEnterData.first().props().value).toEqual('indexPattern1');

    const indexComboBoxClear = wrapper.find('[data-test-subj="comboBoxClearButton"]');
    indexComboBoxClear.first().simulate('click');

    const indexSearchBoxValueAfterEnterData = wrapper.find(
      '[data-test-subj="comboBoxSearchInput"]'
    );
    expect(indexSearchBoxValueAfterEnterData.first().props().value).toEqual('indexPattern1');
  });
});
