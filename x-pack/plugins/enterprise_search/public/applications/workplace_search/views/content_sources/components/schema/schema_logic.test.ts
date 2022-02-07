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
} from '../../../../../__mocks__/kea_logic';
import { mostRecentIndexJob } from '../../../../__mocks__/content_sources.mock';

import { nextTick } from '@kbn/test-jest-helpers';

const contentSource = { id: 'source123' };
jest.mock('../../source_logic', () => ({
  SourceLogic: { values: { contentSource } },
}));

jest.mock('../../../../app_logic', () => ({
  AppLogic: { values: { isOrganization: true } },
}));

const spyScrollTo = jest.fn();
Object.defineProperty(global.window, 'scrollTo', { value: spyScrollTo });

import { ADD, UPDATE } from '../../../../../shared/constants/operations';
import { defaultErrorMessage } from '../../../../../shared/flash_messages/handle_api_errors';
import { SchemaType } from '../../../../../shared/schema/types';
import { itShowsServerErrorAsFlashMessage } from '../../../../../test_helpers';
import { AppLogic } from '../../../../app_logic';

import {
  SCHEMA_FIELD_ERRORS_ERROR_MESSAGE,
  SCHEMA_FIELD_ADDED_MESSAGE,
  SCHEMA_UPDATED_MESSAGE,
} from './constants';
import { SchemaLogic, dataTypeOptions } from './schema_logic';

describe('SchemaLogic', () => {
  const { http } = mockHttpValues;
  const { clearFlashMessages, flashSuccessToast, setErrorMessage } = mockFlashMessageHelpers;
  const { mount } = new LogicMounter(SchemaLogic);

  const DEFAULT_VALUES = {
    sourceId: '',
    activeSchema: {},
    serverSchema: {},
    filterValue: '',
    filteredSchemaFields: {},
    dataTypeOptions,
    showAddFieldModal: false,
    addFieldFormErrors: null,
    mostRecentIndexJob: {},
    fieldCoercionErrors: {},
    newFieldType: SchemaType.Text,
    rawFieldName: '',
    formUnchanged: true,
    dataLoading: true,
  };

  const schema = {
    foo: 'text',
  } as any;

  const fieldCoercionErrors = [
    {
      id: '123',
      error: 'error',
    },
  ] as any;

  const errors = ['this is an error'];

  const serverResponse = {
    schema,
    sourceId: contentSource.id,
    mostRecentIndexJob,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mount();
  });

  it('has expected default values', () => {
    expect(SchemaLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    const initializedState = {
      ...DEFAULT_VALUES,
      activeSchema: schema,
      serverSchema: schema,
      mostRecentIndexJob,
      dataLoading: false,
      filteredSchemaFields: schema,
    };

    it('onInitializeSchema', () => {
      SchemaLogic.actions.onInitializeSchema(serverResponse);

      expect(SchemaLogic.values).toEqual({
        ...initializedState,
        sourceId: contentSource.id,
      });
    });

    it('onInitializeSchemaFieldErrors', () => {
      SchemaLogic.actions.onInitializeSchemaFieldErrors({ fieldCoercionErrors });

      expect(SchemaLogic.values).toEqual({
        ...DEFAULT_VALUES,
        fieldCoercionErrors,
      });
    });
    it('onSchemaSetSuccess', () => {
      SchemaLogic.actions.onSchemaSetSuccess({
        schema,
        mostRecentIndexJob,
      });

      expect(SchemaLogic.values).toEqual({
        ...initializedState,
        newFieldType: SchemaType.Text,
        addFieldFormErrors: null,
        formUnchanged: true,
        showAddFieldModal: false,
        rawFieldName: '',
      });
    });

    it('onSchemaSetFormErrors', () => {
      SchemaLogic.actions.onSchemaSetFormErrors(errors);

      expect(SchemaLogic.values).toEqual({
        ...DEFAULT_VALUES,
        addFieldFormErrors: errors,
      });
    });

    it('updateNewFieldType', () => {
      SchemaLogic.actions.updateNewFieldType(SchemaType.Number);

      expect(SchemaLogic.values).toEqual({
        ...DEFAULT_VALUES,
        newFieldType: SchemaType.Number,
      });
    });

    it('onFieldUpdate', () => {
      SchemaLogic.actions.onFieldUpdate({ schema, formUnchanged: false });

      expect(SchemaLogic.values).toEqual({
        ...DEFAULT_VALUES,
        activeSchema: schema,
        filteredSchemaFields: schema,
        formUnchanged: false,
      });
    });

    it('onIndexingComplete', () => {
      SchemaLogic.actions.onIndexingComplete(1);

      expect(SchemaLogic.values).toEqual({
        ...DEFAULT_VALUES,
        mostRecentIndexJob: {
          ...mostRecentIndexJob,
          activeReindexJobId: undefined,
          percentageComplete: 100,
          hasErrors: true,
          isActive: false,
        },
      });
    });

    it('resetMostRecentIndexJob', () => {
      SchemaLogic.actions.resetMostRecentIndexJob(mostRecentIndexJob);

      expect(SchemaLogic.values).toEqual({
        ...DEFAULT_VALUES,
        mostRecentIndexJob,
      });
    });

    it('setFieldName', () => {
      const NAME = 'name';
      SchemaLogic.actions.setFieldName(NAME);

      expect(SchemaLogic.values).toEqual({
        ...DEFAULT_VALUES,
        rawFieldName: NAME,
      });
    });

    it('setFilterValue', () => {
      const VALUE = 'string';
      SchemaLogic.actions.setFilterValue(VALUE);

      expect(SchemaLogic.values).toEqual({
        ...DEFAULT_VALUES,
        filterValue: VALUE,
      });
    });

    it('openAddFieldModal', () => {
      SchemaLogic.actions.openAddFieldModal();

      expect(SchemaLogic.values).toEqual({
        ...DEFAULT_VALUES,
        showAddFieldModal: true,
      });
    });

    it('closeAddFieldModal', () => {
      SchemaLogic.actions.onSchemaSetFormErrors(errors);
      SchemaLogic.actions.openAddFieldModal();
      SchemaLogic.actions.closeAddFieldModal();

      expect(SchemaLogic.values).toEqual({
        ...DEFAULT_VALUES,
        showAddFieldModal: false,
        addFieldFormErrors: null,
      });
    });

    it('resetSchemaState', () => {
      SchemaLogic.actions.resetSchemaState();

      expect(SchemaLogic.values).toEqual({
        ...DEFAULT_VALUES,
        dataLoading: true,
      });
      expect(clearFlashMessages).toHaveBeenCalled();
    });
  });

  describe('listeners', () => {
    describe('initializeSchema', () => {
      it('calls API and sets values (org)', async () => {
        const onInitializeSchemaSpy = jest.spyOn(SchemaLogic.actions, 'onInitializeSchema');
        http.get.mockReturnValue(Promise.resolve(serverResponse));
        SchemaLogic.actions.initializeSchema();

        expect(http.get).toHaveBeenCalledWith(
          '/internal/workplace_search/org/sources/source123/schemas'
        );
        await nextTick();
        expect(onInitializeSchemaSpy).toHaveBeenCalledWith(serverResponse);
      });

      it('calls API and sets values (account)', async () => {
        AppLogic.values.isOrganization = false;

        const onInitializeSchemaSpy = jest.spyOn(SchemaLogic.actions, 'onInitializeSchema');
        http.get.mockReturnValue(Promise.resolve(serverResponse));
        SchemaLogic.actions.initializeSchema();

        expect(http.get).toHaveBeenCalledWith(
          '/internal/workplace_search/account/sources/source123/schemas'
        );
        await nextTick();
        expect(onInitializeSchemaSpy).toHaveBeenCalledWith(serverResponse);
      });

      itShowsServerErrorAsFlashMessage(http.get, () => {
        SchemaLogic.actions.initializeSchema();
      });
    });

    describe('initializeSchemaFieldErrors', () => {
      it('calls API and sets values (org)', async () => {
        AppLogic.values.isOrganization = true;
        const onInitializeSchemaFieldErrorsSpy = jest.spyOn(
          SchemaLogic.actions,
          'onInitializeSchemaFieldErrors'
        );
        const initPromise = Promise.resolve(serverResponse);
        const promise = Promise.resolve({ fieldCoercionErrors });
        http.get.mockReturnValue(initPromise);
        http.get.mockReturnValue(promise);
        SchemaLogic.actions.initializeSchemaFieldErrors(
          mostRecentIndexJob.activeReindexJobId,
          contentSource.id
        );

        expect(http.get).toHaveBeenCalledWith(
          '/internal/workplace_search/org/sources/source123/schemas'
        );

        await initPromise;
        expect(http.get).toHaveBeenCalledWith(
          '/internal/workplace_search/org/sources/source123/reindex_job/123'
        );

        await promise;
        expect(onInitializeSchemaFieldErrorsSpy).toHaveBeenCalledWith({
          fieldCoercionErrors,
        });
      });

      it('calls API and sets values (account)', async () => {
        AppLogic.values.isOrganization = false;

        const onInitializeSchemaFieldErrorsSpy = jest.spyOn(
          SchemaLogic.actions,
          'onInitializeSchemaFieldErrors'
        );
        const initPromise = Promise.resolve(serverResponse);
        const promise = Promise.resolve({ fieldCoercionErrors });
        http.get.mockReturnValue(initPromise);
        http.get.mockReturnValue(promise);
        SchemaLogic.actions.initializeSchemaFieldErrors(
          mostRecentIndexJob.activeReindexJobId,
          contentSource.id
        );

        expect(http.get).toHaveBeenCalledWith(
          '/internal/workplace_search/account/sources/source123/schemas'
        );

        await initPromise;
        expect(http.get).toHaveBeenCalledWith(
          '/internal/workplace_search/account/sources/source123/reindex_job/123'
        );

        await promise;
        expect(onInitializeSchemaFieldErrorsSpy).toHaveBeenCalledWith({
          fieldCoercionErrors,
        });
      });

      it('handles error', async () => {
        http.get.mockReturnValue(Promise.reject({ error: 'this is an error' }));
        SchemaLogic.actions.initializeSchemaFieldErrors(
          mostRecentIndexJob.activeReindexJobId,
          contentSource.id
        );
        await nextTick();

        expect(setErrorMessage).toHaveBeenCalledWith(SCHEMA_FIELD_ERRORS_ERROR_MESSAGE);
      });
    });

    describe('addNewField', () => {
      it('handles happy path', () => {
        const setServerFieldSpy = jest.spyOn(SchemaLogic.actions, 'setServerField');
        SchemaLogic.actions.onInitializeSchema(serverResponse);
        const newSchema = {
          ...schema,
          bar: SchemaType.Number,
        };
        SchemaLogic.actions.addNewField('bar', SchemaType.Number);

        expect(setServerFieldSpy).toHaveBeenCalledWith(newSchema, ADD);
      });

      it('handles duplicate', () => {
        const onSchemaSetFormErrorsSpy = jest.spyOn(SchemaLogic.actions, 'onSchemaSetFormErrors');
        SchemaLogic.actions.onInitializeSchema(serverResponse);
        SchemaLogic.actions.addNewField('foo', SchemaType.Number);

        expect(onSchemaSetFormErrorsSpy).toHaveBeenCalledWith(['New field already exists: foo.']);
      });
    });

    it('updateExistingFieldType', () => {
      const onFieldUpdateSpy = jest.spyOn(SchemaLogic.actions, 'onFieldUpdate');
      SchemaLogic.actions.onInitializeSchema(serverResponse);
      const newSchema = {
        foo: SchemaType.Number,
      };
      SchemaLogic.actions.updateExistingFieldType('foo', SchemaType.Number);

      expect(onFieldUpdateSpy).toHaveBeenCalledWith({ schema: newSchema, formUnchanged: false });
    });

    it('updateFields', () => {
      const setServerFieldSpy = jest.spyOn(SchemaLogic.actions, 'setServerField');
      SchemaLogic.actions.onInitializeSchema(serverResponse);
      SchemaLogic.actions.updateFields();

      expect(setServerFieldSpy).toHaveBeenCalledWith(schema, UPDATE);
    });

    describe('setServerField', () => {
      beforeEach(() => {
        SchemaLogic.actions.onInitializeSchema(serverResponse);
      });

      describe('adding a field', () => {
        it('calls API and sets values (org)', async () => {
          AppLogic.values.isOrganization = true;
          const onSchemaSetSuccessSpy = jest.spyOn(SchemaLogic.actions, 'onSchemaSetSuccess');
          http.post.mockReturnValue(Promise.resolve(serverResponse));
          SchemaLogic.actions.setServerField(schema, ADD);

          expect(http.post).toHaveBeenCalledWith(
            '/internal/workplace_search/org/sources/source123/schemas',
            {
              body: JSON.stringify({ ...schema }),
            }
          );
          await nextTick();
          expect(flashSuccessToast).toHaveBeenCalledWith(SCHEMA_FIELD_ADDED_MESSAGE);
          expect(onSchemaSetSuccessSpy).toHaveBeenCalledWith(serverResponse);
        });

        it('calls API and sets values (account)', async () => {
          AppLogic.values.isOrganization = false;

          const onSchemaSetSuccessSpy = jest.spyOn(SchemaLogic.actions, 'onSchemaSetSuccess');
          http.post.mockReturnValue(Promise.resolve(serverResponse));
          SchemaLogic.actions.setServerField(schema, ADD);

          expect(http.post).toHaveBeenCalledWith(
            '/internal/workplace_search/account/sources/source123/schemas',
            {
              body: JSON.stringify({ ...schema }),
            }
          );
          await nextTick();
          expect(onSchemaSetSuccessSpy).toHaveBeenCalledWith(serverResponse);
        });

        it('handles error with message', async () => {
          const onSchemaSetFormErrorsSpy = jest.spyOn(SchemaLogic.actions, 'onSchemaSetFormErrors');
          // We expect body.attributes.errors to be a string[] when it is present
          http.post.mockReturnValue(
            Promise.reject({ body: { attributes: { errors: ['this is an error'] } } })
          );
          SchemaLogic.actions.setServerField(schema, ADD);
          await nextTick();

          expect(onSchemaSetFormErrorsSpy).toHaveBeenCalledWith(['this is an error']);
          expect(spyScrollTo).toHaveBeenCalledWith(0, 0);
        });

        it('handles error with no message', async () => {
          const onSchemaSetFormErrorsSpy = jest.spyOn(SchemaLogic.actions, 'onSchemaSetFormErrors');
          http.post.mockReturnValue(Promise.reject());
          SchemaLogic.actions.setServerField(schema, ADD);
          await nextTick();

          expect(onSchemaSetFormErrorsSpy).toHaveBeenCalledWith([defaultErrorMessage]);
          expect(spyScrollTo).toHaveBeenCalledWith(0, 0);
        });
      });

      describe('updating a field', () => {
        it('calls API and sets values (org)', async () => {
          AppLogic.values.isOrganization = true;
          const onSchemaSetSuccessSpy = jest.spyOn(SchemaLogic.actions, 'onSchemaSetSuccess');
          http.post.mockReturnValue(Promise.resolve(serverResponse));
          SchemaLogic.actions.setServerField(schema, UPDATE);

          expect(http.post).toHaveBeenCalledWith(
            '/internal/workplace_search/org/sources/source123/schemas',
            {
              body: JSON.stringify({ ...schema }),
            }
          );
          await nextTick();
          expect(flashSuccessToast).toHaveBeenCalledWith(SCHEMA_UPDATED_MESSAGE);
          expect(onSchemaSetSuccessSpy).toHaveBeenCalledWith(serverResponse);
        });

        it('calls API and sets values (account)', async () => {
          AppLogic.values.isOrganization = false;

          const onSchemaSetSuccessSpy = jest.spyOn(SchemaLogic.actions, 'onSchemaSetSuccess');
          http.post.mockReturnValue(Promise.resolve(serverResponse));
          SchemaLogic.actions.setServerField(schema, UPDATE);

          expect(http.post).toHaveBeenCalledWith(
            '/internal/workplace_search/account/sources/source123/schemas',
            {
              body: JSON.stringify({ ...schema }),
            }
          );
          await nextTick();
          expect(onSchemaSetSuccessSpy).toHaveBeenCalledWith(serverResponse);
        });

        itShowsServerErrorAsFlashMessage(http.post, () => {
          SchemaLogic.actions.setServerField(schema, UPDATE);
        });
      });
    });
  });

  describe('selectors', () => {
    describe('filteredSchemaFields', () => {
      const expectedValues = {
        ...DEFAULT_VALUES,
        dataLoading: false,
        mostRecentIndexJob,
        serverSchema: schema,
        sourceId: contentSource.id,
      };

      it('handles empty response', () => {
        SchemaLogic.actions.onInitializeSchema(serverResponse);
        SchemaLogic.actions.setFilterValue('baz');

        expect(SchemaLogic.values).toEqual({
          ...expectedValues,
          activeSchema: schema,
          filterValue: 'baz',
          filteredSchemaFields: {},
        });
      });

      it('handles filtered response', () => {
        const newSchema = {
          ...schema,
          bar: SchemaType.Number,
        };
        SchemaLogic.actions.onInitializeSchema(serverResponse);
        SchemaLogic.actions.onFieldUpdate({ schema: newSchema, formUnchanged: false });
        SchemaLogic.actions.setFilterValue('foo');

        expect(SchemaLogic.values).toEqual({
          ...expectedValues,
          activeSchema: newSchema,
          filterValue: 'foo',
          filteredSchemaFields: schema,
          formUnchanged: false,
        });
      });
    });
  });
});
