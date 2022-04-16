/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TypeRegistry } from '../../../type_registry';
import { registerBuiltInActionTypes } from '..';
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
  test('connector validation succeeds when connector config is valid', async () => {
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

    expect(await actionTypeModel.validateConnector(actionConnector)).toEqual({
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
  test('connector validation succeeds when connector config is valid', async () => {
    const actionConnector = {
      secrets: {},
      id: 'test',
      actionTypeId: '.index',
      name: 'es_index',
      config: {
        index: 'test_es_index',
      },
    } as EsIndexActionConnector;

    expect(await actionTypeModel.validateConnector(actionConnector)).toEqual({
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
  test('action params validation succeeds when action params are valid', async () => {
    expect(
      await actionTypeModel.validateParams({
        documents: [{ test: 1234 }],
      })
    ).toEqual({
      errors: {
        documents: [],
        indexOverride: [],
      },
    });

    expect(
      await actionTypeModel.validateParams({
        documents: [{ test: 1234 }],
        indexOverride: 'kibana-alert-history-anything',
      })
    ).toEqual({
      errors: {
        documents: [],
        indexOverride: [],
      },
    });
  });

  test('action params validation fails when action params are invalid', async () => {
    expect(await actionTypeModel.validateParams({})).toEqual({
      errors: {
        documents: ['Document is required and should be a valid JSON object.'],
        indexOverride: [],
      },
    });

    expect(
      await actionTypeModel.validateParams({
        documents: [{}],
      })
    ).toEqual({
      errors: {
        documents: ['Document is required and should be a valid JSON object.'],
        indexOverride: [],
      },
    });

    expect(
      await actionTypeModel.validateParams({
        documents: [{}],
        indexOverride: 'kibana-alert-history-',
      })
    ).toEqual({
      errors: {
        documents: ['Document is required and should be a valid JSON object.'],
        indexOverride: ['Alert history index must contain valid suffix.'],
      },
    });

    expect(
      await actionTypeModel.validateParams({
        documents: [{}],
        indexOverride: 'this.is-a_string',
      })
    ).toEqual({
      errors: {
        documents: ['Document is required and should be a valid JSON object.'],
        indexOverride: ['Alert history index must begin with "kibana-alert-history-".'],
      },
    });
  });
});
