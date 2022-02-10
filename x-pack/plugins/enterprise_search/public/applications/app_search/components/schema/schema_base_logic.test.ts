/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockHttpValues } from '../../../__mocks__/kea_logic';
import '../../__mocks__/engine_logic.mock';

import { nextTick } from '@kbn/test-jest-helpers';

import { SchemaType } from '../../../shared/schema/types';

import { itShowsServerErrorAsFlashMessage } from '../../../test_helpers';

import { SchemaBaseLogic } from './schema_base_logic';

describe('SchemaBaseLogic', () => {
  const { mount } = new LogicMounter(SchemaBaseLogic);
  const { http } = mockHttpValues;

  const MOCK_SCHEMA = {
    some_text_field: SchemaType.Text,
    some_number_field: SchemaType.Number,
  };
  const MOCK_RESPONSE = {
    schema: MOCK_SCHEMA,
  } as any;

  const DEFAULT_VALUES = {
    dataLoading: true,
    schema: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values', () => {
    mount();
    expect(SchemaBaseLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('onSchemaLoad', () => {
      it('stores schema state and sets dataLoading to false', () => {
        mount({ schema: {}, dataLoading: true });

        SchemaBaseLogic.actions.onSchemaLoad(MOCK_RESPONSE);

        expect(SchemaBaseLogic.values).toEqual({
          ...DEFAULT_VALUES,
          dataLoading: false,
          schema: MOCK_SCHEMA,
        });
      });
    });

    describe('setSchema', () => {
      it('updates schema state', () => {
        mount({ schema: {} });

        SchemaBaseLogic.actions.setSchema(MOCK_SCHEMA);

        expect(SchemaBaseLogic.values).toEqual({
          ...DEFAULT_VALUES,
          schema: MOCK_SCHEMA,
        });
      });
    });
  });

  describe('listeners', () => {
    describe('loadSchema', () => {
      it('sets dataLoading to true', () => {
        mount({ dataLoading: false });

        SchemaBaseLogic.actions.loadSchema();

        expect(SchemaBaseLogic.values).toEqual({
          ...DEFAULT_VALUES,
          dataLoading: true,
        });
      });

      it('should make an API call and then set schema state', async () => {
        http.get.mockReturnValueOnce(Promise.resolve(MOCK_RESPONSE));
        mount();
        jest.spyOn(SchemaBaseLogic.actions, 'onSchemaLoad');

        SchemaBaseLogic.actions.loadSchema();
        await nextTick();

        expect(http.get).toHaveBeenCalledWith('/internal/app_search/engines/some-engine/schema');
        expect(SchemaBaseLogic.actions.onSchemaLoad).toHaveBeenCalledWith(MOCK_RESPONSE);
      });

      itShowsServerErrorAsFlashMessage(http.get, () => {
        mount();
        SchemaBaseLogic.actions.loadSchema();
      });
    });
  });
});
