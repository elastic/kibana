/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockHttpValues } from '../../../__mocks__';

import { nextTick } from '@kbn/test/jest';

import { SchemaType } from '../../../shared/schema/types';

import { MetaEngineSchemaLogic } from './schema_meta_engine_logic';

describe('MetaEngineSchemaLogic', () => {
  const { mount } = new LogicMounter(MetaEngineSchemaLogic);
  const { http } = mockHttpValues;

  const MOCK_RESPONSE = {
    schema: {
      some_text_field: SchemaType.Text,
      some_number_field: SchemaType.Number,
    },
    fields: {
      some_text_field: {
        text: ['source-engine-a', 'source-engine-b'],
      },
    },
    conflictingFields: {
      some_number_field: {
        number: ['source-engine-a'],
        text: ['source-engine-b'],
      },
    },
  };

  const DEFAULT_VALUES = {
    dataLoading: true,
    schema: {},
    fields: {},
    conflictingFields: {},
    conflictingFieldsCount: 0,
    hasConflicts: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values', () => {
    mount();
    expect(MetaEngineSchemaLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('onMetaEngineSchemaLoad', () => {
      it('stores the API response in state', () => {
        mount();

        MetaEngineSchemaLogic.actions.onMetaEngineSchemaLoad(MOCK_RESPONSE);

        expect(MetaEngineSchemaLogic.values).toEqual({
          ...DEFAULT_VALUES,
          fields: MOCK_RESPONSE.fields,
          conflictingFields: MOCK_RESPONSE.conflictingFields,
          hasConflicts: true,
          conflictingFieldsCount: 1,
        });
      });
    });
  });

  describe('selectors', () => {
    describe('conflictingFieldsCount', () => {
      it('returns the number of conflicting fields', () => {
        mount({ conflictingFields: { field_a: {}, field_b: {} } });
        expect(MetaEngineSchemaLogic.values.conflictingFieldsCount).toEqual(2);
      });
    });

    describe('hasConflictingFields', () => {
      it('returns true when the conflictingFields obj has items', () => {
        mount({ conflictingFields: { field_c: {} } });
        expect(MetaEngineSchemaLogic.values.hasConflicts).toEqual(true);
      });

      it('returns false when the conflictingFields obj is empty', () => {
        mount({ conflictingFields: {} });
        expect(MetaEngineSchemaLogic.values.hasConflicts).toEqual(false);
      });
    });
  });

  describe('listeners', () => {
    describe('loadSourceEngineSchema', () => {
      it('calls the base loadSchema listener and onSchemaLoad', async () => {
        http.get.mockReturnValueOnce(Promise.resolve(MOCK_RESPONSE));
        mount();
        jest.spyOn(MetaEngineSchemaLogic.actions, 'loadSchema');
        jest.spyOn(MetaEngineSchemaLogic.actions, 'onMetaEngineSchemaLoad');

        MetaEngineSchemaLogic.actions.loadMetaEngineSchema();
        await nextTick();

        expect(MetaEngineSchemaLogic.actions.loadSchema).toHaveBeenCalled();
        expect(MetaEngineSchemaLogic.actions.onMetaEngineSchemaLoad).toHaveBeenCalledWith(
          MOCK_RESPONSE
        );
      });
    });
  });
});
