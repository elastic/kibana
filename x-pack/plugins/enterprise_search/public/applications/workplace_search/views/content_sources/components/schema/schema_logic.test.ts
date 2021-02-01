/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LogicMounter, mockFlashMessageHelpers, mockHttpValues } from '../../../../../__mocks__';

import { nextTick } from '@kbn/test/jest';

const contentSource = { id: 'source123' };
jest.mock('../../source_logic', () => ({
  SourceLogic: { values: { contentSource } },
}));

import { AppLogic } from '../../../../app_logic';
jest.mock('../../../../app_logic', () => ({
  AppLogic: { values: { isOrganization: true } },
}));

const spyScrollTo = jest.fn();
Object.defineProperty(global.window, 'scrollTo', { value: spyScrollTo });

import { mostRecentIndexJob } from '../../../../__mocks__/content_sources.mock';
import { TEXT } from '../../../../../shared/constants/field_types';
import { ADD, UPDATE } from '../../../../../shared/constants/operations';

import {
  SCHEMA_FIELD_ERRORS_ERROR_MESSAGE,
  SCHEMA_FIELD_ADDED_MESSAGE,
  SCHEMA_UPDATED_MESSAGE,
} from './constants';

import { SchemaLogic, dataTypeOptions } from './schema_logic';

describe('SchemaLogic', () => {
  const { http } = mockHttpValues;
  const { clearFlashMessages, flashAPIErrors, setSuccessMessage } = mockFlashMessageHelpers;
  const { mount } = new LogicMounter(SchemaLogic);

  const defaultValues = {
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
    newFieldType: TEXT,
    rawFieldName: '',
    formUnchanged: true,
    dataLoading: true,
  };

  const schema = {
    foo: 'text',
  } as any;

  const fieldCoercionErrors = [
    {
      external_id: '123',
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
    expect(SchemaLogic.values).toEqual(defaultValues);
  });

  describe('actions', () => {
    it('onInitializeSchema', () => {
      SchemaLogic.actions.onInitializeSchema(serverResponse);

      expect(SchemaLogic.values.sourceId).toEqual(contentSource.id);
      expect(SchemaLogic.values.activeSchema).toEqual(schema);
      expect(SchemaLogic.values.serverSchema).toEqual(schema);
      expect(SchemaLogic.values.mostRecentIndexJob).toEqual(mostRecentIndexJob);
      expect(SchemaLogic.values.dataLoading).toEqual(false);
    });

    it('onInitializeSchemaFieldErrors', () => {
      SchemaLogic.actions.onInitializeSchemaFieldErrors({ fieldCoercionErrors });

      expect(SchemaLogic.values.fieldCoercionErrors).toEqual(fieldCoercionErrors);
    });
    it('onSchemaSetSuccess', () => {
      SchemaLogic.actions.onSchemaSetSuccess({
        schema,
        mostRecentIndexJob,
      });

      expect(SchemaLogic.values.activeSchema).toEqual(schema);
      expect(SchemaLogic.values.serverSchema).toEqual(schema);
      expect(SchemaLogic.values.mostRecentIndexJob).toEqual(mostRecentIndexJob);
      expect(SchemaLogic.values.newFieldType).toEqual(TEXT);
      expect(SchemaLogic.values.addFieldFormErrors).toEqual(null);
      expect(SchemaLogic.values.formUnchanged).toEqual(true);
      expect(SchemaLogic.values.showAddFieldModal).toEqual(false);
      expect(SchemaLogic.values.dataLoading).toEqual(false);
      expect(SchemaLogic.values.rawFieldName).toEqual('');
    });

    it('onSchemaSetFormErrors', () => {
      SchemaLogic.actions.onSchemaSetFormErrors(errors);

      expect(SchemaLogic.values.addFieldFormErrors).toEqual(errors);
    });

    it('updateNewFieldType', () => {
      const NUMBER = 'number';
      SchemaLogic.actions.updateNewFieldType(NUMBER);

      expect(SchemaLogic.values.newFieldType).toEqual(NUMBER);
    });

    it('onFieldUpdate', () => {
      SchemaLogic.actions.onFieldUpdate({ schema, formUnchanged: false });

      expect(SchemaLogic.values.activeSchema).toEqual(schema);
      expect(SchemaLogic.values.formUnchanged).toEqual(false);
    });

    it('onIndexingComplete', () => {
      SchemaLogic.actions.onIndexingComplete(1);

      expect(SchemaLogic.values.mostRecentIndexJob).toEqual({
        ...mostRecentIndexJob,
        activeReindexJobId: undefined,
        percentageComplete: 100,
        hasErrors: true,
        isActive: false,
      });
    });

    it('resetMostRecentIndexJob', () => {
      SchemaLogic.actions.resetMostRecentIndexJob(mostRecentIndexJob);

      expect(SchemaLogic.values.mostRecentIndexJob).toEqual(mostRecentIndexJob);
    });

    it('setFieldName', () => {
      const NAME = 'name';
      SchemaLogic.actions.setFieldName(NAME);

      expect(SchemaLogic.values.rawFieldName).toEqual(NAME);
    });

    it('setFilterValue', () => {
      const VALUE = 'string';
      SchemaLogic.actions.setFilterValue(VALUE);

      expect(SchemaLogic.values.filterValue).toEqual(VALUE);
    });

    it('openAddFieldModal', () => {
      SchemaLogic.actions.openAddFieldModal();

      expect(SchemaLogic.values.showAddFieldModal).toEqual(true);
    });

    it('closeAddFieldModal', () => {
      SchemaLogic.actions.onSchemaSetFormErrors(errors);
      SchemaLogic.actions.openAddFieldModal();
      SchemaLogic.actions.closeAddFieldModal();

      expect(SchemaLogic.values.showAddFieldModal).toEqual(false);
      expect(SchemaLogic.values.addFieldFormErrors).toEqual(null);
    });

    it('resetSchemaState', () => {
      SchemaLogic.actions.resetSchemaState();

      expect(SchemaLogic.values.dataLoading).toEqual(true);
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
          '/api/workplace_search/org/sources/source123/schemas'
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
          '/api/workplace_search/account/sources/source123/schemas'
        );
        await nextTick();
        expect(onInitializeSchemaSpy).toHaveBeenCalledWith(serverResponse);
      });

      it('handles error', async () => {
        http.get.mockReturnValue(Promise.reject('this is an error'));
        SchemaLogic.actions.initializeSchema();
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('this is an error');
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
          '/api/workplace_search/org/sources/source123/schemas'
        );

        await initPromise;
        expect(http.get).toHaveBeenCalledWith(
          '/api/workplace_search/org/sources/source123/reindex_job/123'
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
          '/api/workplace_search/account/sources/source123/schemas'
        );

        await initPromise;
        expect(http.get).toHaveBeenCalledWith(
          '/api/workplace_search/account/sources/source123/reindex_job/123'
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

        expect(flashAPIErrors).toHaveBeenCalledWith({
          error: 'this is an error',
          message: SCHEMA_FIELD_ERRORS_ERROR_MESSAGE,
        });
      });
    });

    it('addNewField', () => {
      const setServerFieldSpy = jest.spyOn(SchemaLogic.actions, 'setServerField');
      SchemaLogic.actions.onInitializeSchema(serverResponse);
      const newSchema = {
        ...schema,
        bar: 'number',
      };
      SchemaLogic.actions.addNewField('bar', 'number');

      expect(setServerFieldSpy).toHaveBeenCalledWith(newSchema, ADD);
    });

    it('updateExistingFieldType', () => {
      const onFieldUpdateSpy = jest.spyOn(SchemaLogic.actions, 'onFieldUpdate');
      SchemaLogic.actions.onInitializeSchema(serverResponse);
      const newSchema = {
        foo: 'number',
      };
      SchemaLogic.actions.updateExistingFieldType('foo', 'number');

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
            '/api/workplace_search/org/sources/source123/schemas',
            {
              body: JSON.stringify({ ...schema }),
            }
          );
          await nextTick();
          expect(setSuccessMessage).toHaveBeenCalledWith(SCHEMA_FIELD_ADDED_MESSAGE);
          expect(onSchemaSetSuccessSpy).toHaveBeenCalledWith(serverResponse);
        });

        it('calls API and sets values (account)', async () => {
          AppLogic.values.isOrganization = false;

          const onSchemaSetSuccessSpy = jest.spyOn(SchemaLogic.actions, 'onSchemaSetSuccess');
          http.post.mockReturnValue(Promise.resolve(serverResponse));
          SchemaLogic.actions.setServerField(schema, ADD);

          expect(http.post).toHaveBeenCalledWith(
            '/api/workplace_search/account/sources/source123/schemas',
            {
              body: JSON.stringify({ ...schema }),
            }
          );
          await nextTick();
          expect(onSchemaSetSuccessSpy).toHaveBeenCalledWith(serverResponse);
        });

        it('handles error', async () => {
          const onSchemaSetFormErrorsSpy = jest.spyOn(SchemaLogic.actions, 'onSchemaSetFormErrors');
          http.post.mockReturnValue(Promise.reject({ message: 'this is an error' }));
          SchemaLogic.actions.setServerField(schema, ADD);
          await nextTick();

          expect(onSchemaSetFormErrorsSpy).toHaveBeenCalledWith('this is an error');
        });
      });

      describe('updating a field', () => {
        it('calls API and sets values (org)', async () => {
          AppLogic.values.isOrganization = true;
          const onSchemaSetSuccessSpy = jest.spyOn(SchemaLogic.actions, 'onSchemaSetSuccess');
          http.post.mockReturnValue(Promise.resolve(serverResponse));
          SchemaLogic.actions.setServerField(schema, UPDATE);

          expect(http.post).toHaveBeenCalledWith(
            '/api/workplace_search/org/sources/source123/schemas',
            {
              body: JSON.stringify({ ...schema }),
            }
          );
          await nextTick();
          expect(setSuccessMessage).toHaveBeenCalledWith(SCHEMA_UPDATED_MESSAGE);
          expect(onSchemaSetSuccessSpy).toHaveBeenCalledWith(serverResponse);
        });

        it('calls API and sets values (account)', async () => {
          AppLogic.values.isOrganization = false;

          const onSchemaSetSuccessSpy = jest.spyOn(SchemaLogic.actions, 'onSchemaSetSuccess');
          http.post.mockReturnValue(Promise.resolve(serverResponse));
          SchemaLogic.actions.setServerField(schema, UPDATE);

          expect(http.post).toHaveBeenCalledWith(
            '/api/workplace_search/account/sources/source123/schemas',
            {
              body: JSON.stringify({ ...schema }),
            }
          );
          await nextTick();
          expect(onSchemaSetSuccessSpy).toHaveBeenCalledWith(serverResponse);
        });

        it('handles error', async () => {
          http.post.mockReturnValue(Promise.reject('this is an error'));
          SchemaLogic.actions.setServerField(schema, UPDATE);
          await nextTick();

          expect(flashAPIErrors).toHaveBeenCalledWith('this is an error');
        });
      });
    });
  });

  describe('selectors', () => {
    describe('filteredSchemaFields', () => {
      it('handles empty response', () => {
        SchemaLogic.actions.onInitializeSchema(serverResponse);
        SchemaLogic.actions.setFilterValue('baz');

        expect(SchemaLogic.values.filteredSchemaFields).toEqual({});
      });

      it('handles filtered response', () => {
        const newSchema = {
          ...schema,
          bar: 'number',
        };
        SchemaLogic.actions.onInitializeSchema(serverResponse);
        SchemaLogic.actions.onFieldUpdate({ schema: newSchema, formUnchanged: false });
        SchemaLogic.actions.setFilterValue('foo');

        expect(SchemaLogic.values.filteredSchemaFields).toEqual(schema);
      });
    });
  });
});
