/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LogicMounter,
  mockHttpValues,
  mockKibanaValues,
  mockFlashMessageHelpers,
} from '../../../__mocks__/kea_logic';
import { mockEngineValues } from '../../__mocks__';

import { nextTick } from '@kbn/test-jest-helpers';

import { InternalSchemaType } from '../../../shared/schema/types';

import { itShowsServerErrorAsFlashMessage } from '../../../test_helpers';

import { DocumentDetailLogic } from './document_detail_logic';

describe('DocumentDetailLogic', () => {
  const { mount } = new LogicMounter(DocumentDetailLogic);
  const { http } = mockHttpValues;
  const { navigateToUrl } = mockKibanaValues;
  const { flashSuccessToast, flashAPIErrors } = mockFlashMessageHelpers;

  const DEFAULT_VALUES = {
    dataLoading: true,
    fields: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockEngineValues.engineName = 'engine1';
  });

  describe('actions', () => {
    describe('setFields', () => {
      it('should set fields to the provided value and dataLoading to false', () => {
        const fields = [{ name: 'foo', value: ['foo'], type: InternalSchemaType.String }];

        mount({
          dataLoading: true,
          fields: [],
        });

        DocumentDetailLogic.actions.setFields(fields);

        expect(DocumentDetailLogic.values).toEqual({
          ...DEFAULT_VALUES,
          dataLoading: false,
          fields,
        });
      });
    });
  });

  describe('listeners', () => {
    describe('getDocumentDetails', () => {
      it('will call an API endpoint and then store the result', async () => {
        const fields = [{ name: 'name', value: 'python', type: 'string' }];
        jest.spyOn(DocumentDetailLogic.actions, 'setFields');
        http.get.mockReturnValue(Promise.resolve({ fields }));

        DocumentDetailLogic.actions.getDocumentDetails('1');

        expect(http.get).toHaveBeenCalledWith('/internal/app_search/engines/engine1/documents/1');
        await nextTick();
        expect(DocumentDetailLogic.actions.setFields).toHaveBeenCalledWith(fields);
      });

      it('handles errors', async () => {
        mount();
        http.get.mockReturnValue(Promise.reject('An error occurred'));

        DocumentDetailLogic.actions.getDocumentDetails('1');
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledWith('An error occurred', { isQueued: true });
        expect(navigateToUrl).toHaveBeenCalledWith('/engines/engine1/documents');
      });
    });

    describe('deleteDocument', () => {
      let confirmSpy: any;

      beforeEach(() => {
        confirmSpy = jest.spyOn(window, 'confirm');
        confirmSpy.mockImplementation(jest.fn(() => true));
        http.delete.mockReturnValue(Promise.resolve({}));
      });

      afterEach(() => {
        confirmSpy.mockRestore();
      });

      it('will call an API endpoint and show a success message on the documents page', async () => {
        mount();
        DocumentDetailLogic.actions.deleteDocument('1');

        expect(http.delete).toHaveBeenCalledWith(
          '/internal/app_search/engines/engine1/documents/1'
        );
        await nextTick();
        expect(flashSuccessToast).toHaveBeenCalledWith('Your document was deleted');
        expect(navigateToUrl).toHaveBeenCalledWith('/engines/engine1/documents');
      });

      it('will do nothing if not confirmed', async () => {
        mount();
        window.confirm = () => false;

        DocumentDetailLogic.actions.deleteDocument('1');

        expect(http.delete).not.toHaveBeenCalled();
        await nextTick();
      });

      itShowsServerErrorAsFlashMessage(http.delete, () => {
        mount();
        DocumentDetailLogic.actions.deleteDocument('1');
      });
    });
  });
});
