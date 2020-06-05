/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { FunctionComponent } from 'react';
import { mountWithIntl, nextTick } from 'test_utils/enzyme_helpers';
import { act } from 'react-dom/test-utils';
import { TypeRegistry } from '../../type_registry';
import { registerBuiltInActionTypes } from './index';
import { ActionTypeModel, ActionParamsProps } from '../../../types';
import { IndexActionParams, EsIndexActionConnector } from './types';
import { coreMock } from '../../../../../../../src/core/public/mocks';
jest.mock('../../../common/index_controls', () => ({
  firstFieldOption: jest.fn(),
  getFields: jest.fn(),
  getIndexOptions: jest.fn(),
  getIndexPatterns: jest.fn(),
}));

const ACTION_TYPE_ID = '.index';
let actionTypeModel: ActionTypeModel;

beforeAll(() => {
  const actionTypeRegistry = new TypeRegistry<ActionTypeModel>();
  registerBuiltInActionTypes({ actionTypeRegistry });
  const getResult = actionTypeRegistry.get(ACTION_TYPE_ID);
  if (getResult !== null) {
    actionTypeModel = getResult;
  }
});

describe('actionTypeRegistry.get() works', () => {
  test('action type .index is registered', () => {
    expect(actionTypeModel.id).toEqual(ACTION_TYPE_ID);
    expect(actionTypeModel.iconClass).toEqual('indexOpen');
  });
});

describe('index connector validation', () => {
  test('connector validation succeeds when connector config is valid', () => {
    const actionConnector = {
      secrets: {},
      id: 'test',
      actionTypeId: '.index',
      name: 'es_index',
      config: {
        index: 'test_es_index',
        refresh: false,
        executionTimeField: '1',
      },
    } as EsIndexActionConnector;

    expect(actionTypeModel.validateConnector(actionConnector)).toEqual({
      errors: {
        index: [],
      },
    });
  });
});

describe('index connector validation with minimal config', () => {
  test('connector validation succeeds when connector config is valid', () => {
    const actionConnector = {
      secrets: {},
      id: 'test',
      actionTypeId: '.index',
      name: 'es_index',
      config: {
        index: 'test_es_index',
      },
    } as EsIndexActionConnector;

    expect(actionTypeModel.validateConnector(actionConnector)).toEqual({
      errors: {
        index: [],
      },
    });
  });
});

describe('action params validation', () => {
  test('action params validation succeeds when action params is valid', () => {
    const actionParams = {
      documents: ['test'],
    };

    expect(actionTypeModel.validateParams(actionParams)).toEqual({
      errors: {},
    });

    const emptyActionParams = {};

    expect(actionTypeModel.validateParams(emptyActionParams)).toEqual({
      errors: {},
    });
  });
});

describe('IndexActionConnectorFields renders', () => {
  test('all connector fields is rendered', async () => {
    const mocks = coreMock.createSetup();

    expect(actionTypeModel.actionConnectorFields).not.toBeNull();
    if (!actionTypeModel.actionConnectorFields) {
      return;
    }

    const { getIndexPatterns } = jest.requireMock('../../../common/index_controls');
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
    const { getFields } = jest.requireMock('../../../common/index_controls');
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
    const ConnectorFields = actionTypeModel.actionConnectorFields;
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
      <ConnectorFields
        action={actionConnector}
        errors={{ index: [] }}
        editActionConfig={() => {}}
        editActionSecrets={() => {}}
        http={mocks.http}
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

describe('IndexParamsFields renders', () => {
  test('all params fields is rendered', () => {
    expect(actionTypeModel.actionParamsFields).not.toBeNull();
    if (!actionTypeModel.actionParamsFields) {
      return;
    }
    const ParamsFields = actionTypeModel.actionParamsFields as FunctionComponent<
      ActionParamsProps<IndexActionParams>
    >;
    const actionParams = {
      documents: [{ test: 123 }],
    };
    const wrapper = mountWithIntl(
      <ParamsFields
        actionParams={actionParams}
        errors={{ index: [] }}
        editAction={() => {}}
        index={0}
      />
    );
    expect(wrapper.find('[data-test-subj="actionIndexDoc"]').first().prop('value')).toBe(`{
  "test": 123
}`);
    expect(wrapper.find('[data-test-subj="documentsAddVariableButton"]').length > 0).toBeTruthy();
  });
});
