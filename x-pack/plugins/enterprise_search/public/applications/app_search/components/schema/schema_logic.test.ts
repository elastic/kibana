/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LogicMounter,
  mockFlashMessageHelpers,
  mockHttpValues,
} from '../../../__mocks__/kea_logic';
import { mockEngineActions } from '../../__mocks__/engine_logic.mock';

import { nextTick } from '@kbn/test-jest-helpers';

import { SchemaType, Schema } from '../../../shared/schema/types';

import { SchemaLogic } from './schema_logic';

describe('SchemaLogic', () => {
  const { mount } = new LogicMounter(SchemaLogic);
  const { http } = mockHttpValues;
  const { flashAPIErrors, flashSuccessToast, setErrorMessage } = mockFlashMessageHelpers;

  const MOCK_RESPONSE = {
    schema: {
      some_text_field: SchemaType.Text,
      some_number_field: SchemaType.Number,
    },
    mostRecentIndexJob: {
      percentageComplete: 100,
      numDocumentsWithErrors: 10,
      activeReindexJobId: 'some-id',
      isActive: false,
      hasErrors: true,
    },
    unconfirmedFields: ['some_field'],
    unsearchedUnconfirmedFields: true,
  };

  const DEFAULT_VALUES = {
    dataLoading: true,
    schema: {},
    isUpdating: false,
    hasSchema: false,
    hasSchemaChanged: false,
    cachedSchema: {},
    mostRecentIndexJob: {},
    unconfirmedFields: [],
    hasUnconfirmedFields: false,
    hasNewUnsearchedFields: false,
    isModalOpen: false,
  };

  /*
   * Unfortunately, we can't mount({ schema: ... }) & have to use an action to set schema
   * because of the separate connected logic file - our LogicMounter test helper sets context
   * for only the currently tested file
   */
  const mountAndSetSchema = ({ schema, ...values }: { schema: Schema; [key: string]: unknown }) => {
    mount(values);
    SchemaLogic.actions.setSchema(schema);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has expected default values', () => {
    mount();
    expect(SchemaLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('onSchemaLoad', () => {
      it('stores the API response in state and sets isUpdating & isModalOpen to false', () => {
        mount({ isModalOpen: true });

        SchemaLogic.actions.onSchemaLoad(MOCK_RESPONSE);

        expect(SchemaLogic.values).toEqual({
          ...DEFAULT_VALUES,
          // SchemaBaseLogic
          dataLoading: false,
          schema: MOCK_RESPONSE.schema,
          // SchemaLogic
          isUpdating: false,
          isModalOpen: false,
          cachedSchema: MOCK_RESPONSE.schema,
          hasSchema: true,
          mostRecentIndexJob: MOCK_RESPONSE.mostRecentIndexJob,
          unconfirmedFields: MOCK_RESPONSE.unconfirmedFields,
          hasUnconfirmedFields: true,
          hasNewUnsearchedFields: MOCK_RESPONSE.unsearchedUnconfirmedFields,
        });
      });
    });

    describe('onSchemaUpdateError', () => {
      it('sets isUpdating & isModalOpen to false', () => {
        mount({ isUpdating: true, isModalOpen: true });

        SchemaLogic.actions.onSchemaUpdateError();

        expect(SchemaLogic.values).toEqual({
          ...DEFAULT_VALUES,
          isUpdating: false,
          isModalOpen: false,
        });
      });
    });

    describe('openModal', () => {
      it('sets isModalOpen to true', () => {
        mount({ isModalOpen: false });

        SchemaLogic.actions.openModal();

        expect(SchemaLogic.values).toEqual({
          ...DEFAULT_VALUES,
          isModalOpen: true,
        });
      });
    });

    describe('closeModal', () => {
      it('sets isModalOpen to false', () => {
        mount({ isModalOpen: true });

        SchemaLogic.actions.closeModal();

        expect(SchemaLogic.values).toEqual({
          ...DEFAULT_VALUES,
          isModalOpen: false,
        });
      });
    });
  });

  describe('selectors', () => {
    describe('hasSchema', () => {
      it('returns true when the cached server schema obj has items', () => {
        mount({ cachedSchema: { test: SchemaType.Text } });
        expect(SchemaLogic.values.hasSchema).toEqual(true);
      });

      it('returns false when the cached server schema obj is empty', () => {
        mount({ schema: {} });
        expect(SchemaLogic.values.hasSchema).toEqual(false);
      });
    });

    describe('hasSchemaChanged', () => {
      it('returns true when the schema state is different from the cachedSchema state', () => {
        mountAndSetSchema({
          schema: { test: SchemaType.Text },
          cachedSchema: { test: SchemaType.Number },
        });

        expect(SchemaLogic.values.hasSchemaChanged).toEqual(true);
      });

      it('returns false when the stored schema is the same as cachedSchema', () => {
        mountAndSetSchema({
          schema: { test: SchemaType.Text },
          cachedSchema: { test: SchemaType.Text },
        });

        expect(SchemaLogic.values.hasSchemaChanged).toEqual(false);
      });
    });

    describe('hasUnconfirmedFields', () => {
      it('returns true when the unconfirmedFields array has items', () => {
        mount({ unconfirmedFields: ['hello_world'] });
        expect(SchemaLogic.values.hasUnconfirmedFields).toEqual(true);
      });

      it('returns false when the unconfirmedFields array is empty', () => {
        mount({ unconfirmedFields: [] });
        expect(SchemaLogic.values.hasUnconfirmedFields).toEqual(false);
      });
    });
  });

  describe('listeners', () => {
    describe('addSchemaField', () => {
      describe('if the schema field already exists', () => {
        it('flashes an error and closes the modal', () => {
          mountAndSetSchema({ schema: { existing_field: SchemaType.Text } });
          jest.spyOn(SchemaLogic.actions, 'closeModal');

          SchemaLogic.actions.addSchemaField('existing_field', SchemaType.Text);

          expect(setErrorMessage).toHaveBeenCalledWith('Field name already exists: existing_field');
          expect(SchemaLogic.actions.closeModal).toHaveBeenCalled();
        });
      });

      describe('if the schema field does not already exist', () => {
        it('updates the schema state and calls updateSchema with a custom success message', () => {
          mount();
          jest.spyOn(SchemaLogic.actions, 'setSchema');
          jest.spyOn(SchemaLogic.actions, 'updateSchema');

          SchemaLogic.actions.addSchemaField('new_field', SchemaType.Date);

          expect(SchemaLogic.actions.setSchema).toHaveBeenCalledWith({
            new_field: SchemaType.Date,
          });
          expect(SchemaLogic.actions.updateSchema).toHaveBeenCalledWith(
            'New field added: new_field'
          );
        });
      });
    });

    describe('updateSchemaFieldType', () => {
      it("updates an existing schema key's field type value", async () => {
        mountAndSetSchema({ schema: { existing_field: SchemaType.Text } });
        jest.spyOn(SchemaLogic.actions, 'setSchema');

        SchemaLogic.actions.updateSchemaFieldType('existing_field', SchemaType.Geolocation);

        expect(SchemaLogic.actions.setSchema).toHaveBeenCalledWith({
          existing_field: SchemaType.Geolocation,
        });
      });
    });

    describe('updateSchema', () => {
      it('sets isUpdating to true', () => {
        mount({ isUpdating: false });

        SchemaLogic.actions.updateSchema();

        expect(SchemaLogic.values).toEqual({
          ...DEFAULT_VALUES,
          isUpdating: true,
        });
      });

      it('should make an API call and then set schema state', async () => {
        http.post.mockReturnValueOnce(Promise.resolve(MOCK_RESPONSE));
        mount();
        jest.spyOn(SchemaLogic.actions, 'onSchemaLoad');

        SchemaLogic.actions.updateSchema();
        await nextTick();

        expect(http.post).toHaveBeenCalledWith('/internal/app_search/engines/some-engine/schema', {
          body: '{}',
        });
        expect(SchemaLogic.actions.onSchemaLoad).toHaveBeenCalledWith(MOCK_RESPONSE);
      });

      it('should call flashSuccessToast with a custom success message if passed', async () => {
        http.post.mockReturnValueOnce(Promise.resolve(MOCK_RESPONSE));
        mount();

        SchemaLogic.actions.updateSchema('wow it worked!!');
        await nextTick();

        expect(flashSuccessToast).toHaveBeenCalledWith('wow it worked!!');
      });

      it('should always call EngineLogic.actions.initializeEngine to refresh engine-wide state', async () => {
        mount();

        SchemaLogic.actions.updateSchema();
        await nextTick();

        expect(mockEngineActions.initializeEngine).toHaveBeenCalled();
      });

      it('handles errors and resets bad schema state back to cached/server values', async () => {
        const MOCK_ERROR = 'Fields cannot contain more than 64 characters';
        const MOCK_CACHED_SCHEMA = { ok_field: SchemaType.Text };

        http.post.mockReturnValueOnce(Promise.reject(MOCK_ERROR));
        mount({ cachedSchema: MOCK_CACHED_SCHEMA });
        jest.spyOn(SchemaLogic.actions, 'onSchemaUpdateError');
        jest.spyOn(SchemaLogic.actions, 'setSchema');

        SchemaLogic.actions.updateSchema();
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith(MOCK_ERROR);
        expect(SchemaLogic.actions.onSchemaUpdateError).toHaveBeenCalled();
        expect(SchemaLogic.actions.setSchema).toHaveBeenCalledWith(MOCK_CACHED_SCHEMA);
      });
    });
  });
});
