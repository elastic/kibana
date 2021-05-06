/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockFlashMessageHelpers, mockHttpValues } from '../../../__mocks__';
import '../../__mocks__/engine_logic.mock';

import { nextTick } from '@kbn/test/jest';

import { SchemaType } from '../../../shared/schema/types';

import { SchemaBaseLogic } from './schema_base_logic';

describe('SchemaBaseLogic', () => {
  const { mount } = new LogicMounter(SchemaBaseLogic);
  const { http } = mockHttpValues;
  const { flashAPIErrors } = mockFlashMessageHelpers;

  const MOCK_SCHEMA = {
    some_text_field: SchemaType.Text,
    some_number_field: SchemaType.Number,
  };

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
    describe('setSchema', () => {
      it('stores schema state and sets dataLoading to false', () => {
        mount({ schema: {}, dataLoading: true });

        SchemaBaseLogic.actions.setSchema(MOCK_SCHEMA);

        expect(SchemaBaseLogic.values).toEqual({
          ...DEFAULT_VALUES,
          schema: MOCK_SCHEMA,
          dataLoading: false,
        });
      });
    });
  });

  describe('listeners', () => {
    const MOCK_RESPONSE = {
      schema: MOCK_SCHEMA,
    };
    const mockCallback = jest.fn();

    describe('loadSchema', () => {
      it('should make an API call and then set schema state', async () => {
        http.get.mockReturnValueOnce(Promise.resolve(MOCK_RESPONSE));
        mount();
        jest.spyOn(SchemaBaseLogic.actions, 'setSchema');

        SchemaBaseLogic.actions.loadSchema(mockCallback);
        await nextTick();

        expect(http.get).toHaveBeenCalledWith('/api/app_search/engines/some-engine/schema');
        expect(SchemaBaseLogic.actions.setSchema).toHaveBeenCalledWith(MOCK_SCHEMA);
      });

      it('should send the entire API response to the passed callback', async () => {
        http.get.mockReturnValueOnce(Promise.resolve(MOCK_RESPONSE));
        mount();

        SchemaBaseLogic.actions.loadSchema(mockCallback);
        await nextTick();

        expect(mockCallback).toHaveBeenCalledWith(MOCK_RESPONSE);
      });

      it('handles errors', async () => {
        http.get.mockReturnValueOnce(Promise.reject('error'));
        mount();

        SchemaBaseLogic.actions.loadSchema(mockCallback);
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('error');
      });
    });
  });
});
