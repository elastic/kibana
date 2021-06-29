/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter } from '../../../__mocks__/kea_logic';

import { SchemaType } from '../../../shared/schema/types';

import { MetaEngineSchemaLogic } from './schema_meta_engine_logic';

describe('MetaEngineSchemaLogic', () => {
  const { mount } = new LogicMounter(MetaEngineSchemaLogic);

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
    describe('onSchemaLoad', () => {
      it('stores the API response in state', () => {
        mount();

        MetaEngineSchemaLogic.actions.onSchemaLoad(MOCK_RESPONSE);

        expect(MetaEngineSchemaLogic.values).toEqual({
          ...DEFAULT_VALUES,
          // SchemaBaseLogic
          dataLoading: false,
          schema: MOCK_RESPONSE.schema,
          // MetaEngineSchemaLogic
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
});
