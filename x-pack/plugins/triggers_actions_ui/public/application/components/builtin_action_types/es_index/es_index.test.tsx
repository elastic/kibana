/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeRegistry } from '../../../type_registry';
import { registerBuiltInActionTypes } from '../index';
import { ActionTypeModel } from '../../../../types';
import { EsIndexActionConnector } from '../types';

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
      config: {
        errors: {
          index: [],
        },
      },
      secrets: {
        errors: {},
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
      config: {
        errors: {
          index: [],
        },
      },
      secrets: {
        errors: {},
      },
    });
  });
});

describe('action params validation', () => {
  test('action params validation succeeds when action params is valid', () => {
    const actionParams = {
      documents: [{ test: 1234 }],
    };

    expect(actionTypeModel.validateParams(actionParams)).toEqual({
      errors: {
        documents: [],
      },
    });

    const emptyActionParams = {};

    expect(actionTypeModel.validateParams(emptyActionParams)).toEqual({
      errors: {
        documents: ['Document is required and should be a valid JSON object.'],
      },
    });

    const invalidDocumentActionParams = {
      documents: [{}],
    };

    expect(actionTypeModel.validateParams(invalidDocumentActionParams)).toEqual({
      errors: {
        documents: ['Document is required and should be a valid JSON object.'],
      },
    });
  });
});
