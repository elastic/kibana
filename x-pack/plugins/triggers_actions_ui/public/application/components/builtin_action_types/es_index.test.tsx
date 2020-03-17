/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { FunctionComponent } from 'react';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { TypeRegistry } from '../../type_registry';
import { registerBuiltInActionTypes } from './index';
import { ActionTypeModel, ActionParamsProps } from '../../../types';
import { IndexActionParams, EsIndexActionConnector } from './types';
import { coreMock } from '../../../../../../../src/core/public/mocks';

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
  test('all connector fields is rendered', () => {
    const mocks = coreMock.createSetup();

    expect(actionTypeModel.actionConnectorFields).not.toBeNull();
    if (!actionTypeModel.actionConnectorFields) {
      return;
    }
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
    expect(wrapper.find('[data-test-subj="connectorIndexesComboBox"]').length > 0).toBeTruthy();
    expect(wrapper.find('[data-test-subj="indexRefreshCheckbox"]').length > 0).toBeTruthy();
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
      documents: ['test'],
    };
    const wrapper = mountWithIntl(
      <ParamsFields
        actionParams={actionParams}
        errors={{ index: [] }}
        editAction={() => {}}
        index={0}
      />
    );
    expect(
      wrapper
        .find('[data-test-subj="actionIndexDoc"]')
        .first()
        .prop('value')
    ).toBe('"test"');
  });
});
