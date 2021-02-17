/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mountWithIntl, nextTick } from '@kbn/test/jest';
import { act } from 'react-dom/test-utils';
import { EsIndexActionConnector } from '../types';
import IndexActionConnectorFields from './es_index_connector';
jest.mock('../../../../common/lib/kibana');

jest.mock('../../../../common/index_controls', () => ({
  firstFieldOption: jest.fn(),
  getFields: jest.fn(),
  getIndexOptions: jest.fn(),
  getIndexPatterns: jest.fn(),
}));

describe('IndexActionConnectorFields renders', () => {
  test('all connector fields is rendered', async () => {
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
        readOnly={false}
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
