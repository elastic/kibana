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
  mockKibanaValues,
  expectedAsyncError,
} from '../../../__mocks__';
import { fullContentSources, contentItems } from '../../__mocks__/content_sources.mock';
import { meta } from '../../__mocks__/meta.mock';

import { DEFAULT_META } from '../../../shared/constants';

jest.mock('../../app_logic', () => ({
  AppLogic: { values: { isOrganization: true } },
}));
import { AppLogic } from '../../app_logic';

import { NOT_FOUND_PATH } from '../../routes';

import { SourceLogic } from './source_logic';

describe('SourceLogic', () => {
  const { http } = mockHttpValues;
  const {
    clearFlashMessages,
    flashAPIErrors,
    setSuccessMessage,
    setQueuedSuccessMessage,
    setErrorMessage,
  } = mockFlashMessageHelpers;
  const { navigateToUrl } = mockKibanaValues;
  const { mount, getListeners } = new LogicMounter(SourceLogic);

  const contentSource = fullContentSources[0];

  const defaultValues = {
    contentSource: {},
    contentItems: [],
    dataLoading: true,
    sectionLoading: true,
    buttonLoading: false,
    contentMeta: DEFAULT_META,
    contentFilterValue: '',
  };

  const searchServerResponse = {
    results: contentItems,
    meta,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mount();
  });

  it('has expected default values', () => {
    expect(SourceLogic.values).toEqual(defaultValues);
  });

  describe('actions', () => {
    it('onInitializeSource', () => {
      SourceLogic.actions.onInitializeSource(contentSource);

      expect(SourceLogic.values.contentSource).toEqual(contentSource);
      expect(SourceLogic.values.dataLoading).toEqual(false);
    });

    it('onUpdateSourceName', () => {
      const NAME = 'foo';
      SourceLogic.actions.onInitializeSource(contentSource);
      SourceLogic.actions.onUpdateSourceName(NAME);

      expect(SourceLogic.values.contentSource).toEqual({
        ...contentSource,
        name: NAME,
      });
      expect(setSuccessMessage).toHaveBeenCalled();
    });

    it('setSearchResults', () => {
      SourceLogic.actions.setSearchResults(searchServerResponse);

      expect(SourceLogic.values.contentItems).toEqual(contentItems);
      expect(SourceLogic.values.contentMeta).toEqual(meta);
      expect(SourceLogic.values.sectionLoading).toEqual(false);
    });

    it('setContentFilterValue', () => {
      const VALUE = 'bar';
      SourceLogic.actions.setSearchResults(searchServerResponse);
      SourceLogic.actions.onInitializeSource(contentSource);
      SourceLogic.actions.setContentFilterValue(VALUE);

      expect(SourceLogic.values.contentMeta).toEqual({
        ...meta,
        page: {
          ...meta.page,
          current: DEFAULT_META.page.current,
        },
      });
      expect(SourceLogic.values.contentFilterValue).toEqual(VALUE);
    });

    it('setActivePage', () => {
      const PAGE = 2;
      SourceLogic.actions.setSearchResults(searchServerResponse);
      SourceLogic.actions.setActivePage(PAGE);

      expect(SourceLogic.values.contentMeta).toEqual({
        ...meta,
        page: {
          ...meta.page,
          current: PAGE,
        },
      });
    });

    it('setButtonNotLoading', () => {
      // Set button state to loading
      SourceLogic.actions.removeContentSource(contentSource.id);
      SourceLogic.actions.setButtonNotLoading();

      expect(SourceLogic.values.buttonLoading).toEqual(false);
    });
  });

  describe('listeners', () => {
    describe('initializeSource', () => {
      it('calls API and sets values (org)', async () => {
        const onInitializeSourceSpy = jest.spyOn(SourceLogic.actions, 'onInitializeSource');
        const promise = Promise.resolve(contentSource);
        http.get.mockReturnValue(promise);
        SourceLogic.actions.initializeSource(contentSource.id);

        expect(http.get).toHaveBeenCalledWith('/api/workplace_search/org/sources/123');
        await promise;
        expect(onInitializeSourceSpy).toHaveBeenCalledWith(contentSource);
      });

      it('calls API and sets values (account)', async () => {
        AppLogic.values.isOrganization = false;

        const onInitializeSourceSpy = jest.spyOn(SourceLogic.actions, 'onInitializeSource');
        const promise = Promise.resolve(contentSource);
        http.get.mockReturnValue(promise);
        SourceLogic.actions.initializeSource(contentSource.id);

        expect(http.get).toHaveBeenCalledWith('/api/workplace_search/account/sources/123');
        await promise;
        expect(onInitializeSourceSpy).toHaveBeenCalledWith(contentSource);
      });

      it('handles federated source', async () => {
        AppLogic.values.isOrganization = false;

        const initializeFederatedSummarySpy = jest.spyOn(
          SourceLogic.actions,
          'initializeFederatedSummary'
        );
        const promise = Promise.resolve({
          ...contentSource,
          isFederatedSource: true,
        });
        http.get.mockReturnValue(promise);
        SourceLogic.actions.initializeSource(contentSource.id);

        expect(http.get).toHaveBeenCalledWith('/api/workplace_search/account/sources/123');
        await promise;
        expect(initializeFederatedSummarySpy).toHaveBeenCalledWith(contentSource.id);
      });

      it('handles error', async () => {
        const error = {
          response: {
            error: 'this is an error',
            status: 400,
          },
        };
        const promise = Promise.reject(error);
        http.get.mockReturnValue(promise);
        SourceLogic.actions.initializeSource(contentSource.id);
        await expectedAsyncError(promise);

        expect(flashAPIErrors).toHaveBeenCalledWith(error);
      });

      it('handles not found state', async () => {
        const error = {
          response: {
            error: 'this is an error',
            status: 404,
          },
        };
        const promise = Promise.reject(error);
        http.get.mockReturnValue(promise);
        SourceLogic.actions.initializeSource(contentSource.id);
        await expectedAsyncError(promise);

        expect(navigateToUrl).toHaveBeenCalledWith(NOT_FOUND_PATH);
      });

      it('renders error messages passed in success response from server', async () => {
        const errors = ['ERROR'];
        const promise = Promise.resolve({
          ...contentSource,
          errors,
        });
        http.get.mockReturnValue(promise);
        SourceLogic.actions.initializeSource(contentSource.id);
        await promise;

        expect(setErrorMessage).toHaveBeenCalledWith(errors);
      });
    });

    describe('initializeFederatedSummary', () => {
      it('calls API and sets values', async () => {
        const onUpdateSummarySpy = jest.spyOn(SourceLogic.actions, 'onUpdateSummary');
        const promise = Promise.resolve(contentSource);
        http.get.mockReturnValue(promise);
        SourceLogic.actions.initializeFederatedSummary(contentSource.id);

        expect(http.get).toHaveBeenCalledWith(
          '/api/workplace_search/account/sources/123/federated_summary'
        );
        await promise;
        expect(onUpdateSummarySpy).toHaveBeenCalledWith(contentSource.summary);
      });

      it('handles error', async () => {
        const error = {
          response: {
            error: 'this is an error',
            status: 400,
          },
        };
        const promise = Promise.reject(error);
        http.get.mockReturnValue(promise);
        SourceLogic.actions.initializeFederatedSummary(contentSource.id);
        await expectedAsyncError(promise);

        expect(flashAPIErrors).toHaveBeenCalledWith(error);
      });
    });

    describe('searchContentSourceDocuments', () => {
      const mockBreakpoint = jest.fn();
      const values = { contentMeta: meta, contentFilterValue: '' };
      const actions = { setSearchResults: jest.fn() };
      const { searchContentSourceDocuments } = getListeners({
        values,
        actions,
      });

      it('calls API and sets values (org)', async () => {
        AppLogic.values.isOrganization = true;
        const promise = Promise.resolve(searchServerResponse);
        http.post.mockReturnValue(promise);

        await searchContentSourceDocuments({ sourceId: contentSource.id }, mockBreakpoint);
        expect(http.post).toHaveBeenCalledWith('/api/workplace_search/org/sources/123/documents', {
          body: JSON.stringify({ query: '', page: meta.page }),
        });

        await promise;
        expect(actions.setSearchResults).toHaveBeenCalledWith(searchServerResponse);
      });

      it('calls API and sets values (account)', async () => {
        AppLogic.values.isOrganization = false;
        const promise = Promise.resolve(searchServerResponse);
        http.post.mockReturnValue(promise);

        SourceLogic.actions.searchContentSourceDocuments(contentSource.id);
        await searchContentSourceDocuments({ sourceId: contentSource.id }, mockBreakpoint);
        expect(http.post).toHaveBeenCalledWith(
          '/api/workplace_search/account/sources/123/documents',
          {
            body: JSON.stringify({ query: '', page: meta.page }),
          }
        );

        await promise;
        expect(actions.setSearchResults).toHaveBeenCalledWith(searchServerResponse);
      });

      it('handles error', async () => {
        const error = {
          response: {
            error: 'this is an error',
            status: 400,
          },
        };
        const promise = Promise.reject(error);
        http.post.mockReturnValue(promise);

        await searchContentSourceDocuments({ sourceId: contentSource.id }, mockBreakpoint);
        await expectedAsyncError(promise);

        expect(flashAPIErrors).toHaveBeenCalledWith(error);
      });
    });

    describe('updateContentSource', () => {
      it('calls API and sets values (org)', async () => {
        AppLogic.values.isOrganization = true;

        const onUpdateSourceNameSpy = jest.spyOn(SourceLogic.actions, 'onUpdateSourceName');
        const promise = Promise.resolve(contentSource);
        http.patch.mockReturnValue(promise);
        SourceLogic.actions.updateContentSource(contentSource.id, contentSource);

        expect(http.patch).toHaveBeenCalledWith('/api/workplace_search/org/sources/123/settings', {
          body: JSON.stringify({ content_source: contentSource }),
        });
        await promise;
        expect(onUpdateSourceNameSpy).toHaveBeenCalledWith(contentSource.name);
      });

      it('calls API and sets values (account)', async () => {
        AppLogic.values.isOrganization = false;

        const onUpdateSourceNameSpy = jest.spyOn(SourceLogic.actions, 'onUpdateSourceName');
        const promise = Promise.resolve(contentSource);
        http.patch.mockReturnValue(promise);
        SourceLogic.actions.updateContentSource(contentSource.id, contentSource);

        expect(http.patch).toHaveBeenCalledWith(
          '/api/workplace_search/account/sources/123/settings',
          {
            body: JSON.stringify({ content_source: contentSource }),
          }
        );
        await promise;
        expect(onUpdateSourceNameSpy).toHaveBeenCalledWith(contentSource.name);
      });

      it('handles error', async () => {
        const error = {
          response: {
            error: 'this is an error',
            status: 400,
          },
        };
        const promise = Promise.reject(error);
        http.patch.mockReturnValue(promise);
        SourceLogic.actions.updateContentSource(contentSource.id, contentSource);
        await expectedAsyncError(promise);

        expect(flashAPIErrors).toHaveBeenCalledWith(error);
      });
    });

    describe('removeContentSource', () => {
      it('calls API and sets values (org)', async () => {
        AppLogic.values.isOrganization = true;

        const setButtonNotLoadingSpy = jest.spyOn(SourceLogic.actions, 'setButtonNotLoading');
        const promise = Promise.resolve(contentSource);
        http.delete.mockReturnValue(promise);
        SourceLogic.actions.removeContentSource(contentSource.id);

        expect(clearFlashMessages).toHaveBeenCalled();
        expect(http.delete).toHaveBeenCalledWith('/api/workplace_search/org/sources/123');
        await promise;
        expect(setQueuedSuccessMessage).toHaveBeenCalled();
        expect(setButtonNotLoadingSpy).toHaveBeenCalled();
      });

      it('calls API and sets values (account)', async () => {
        AppLogic.values.isOrganization = false;

        const setButtonNotLoadingSpy = jest.spyOn(SourceLogic.actions, 'setButtonNotLoading');
        const promise = Promise.resolve(contentSource);
        http.delete.mockReturnValue(promise);
        SourceLogic.actions.removeContentSource(contentSource.id);

        expect(clearFlashMessages).toHaveBeenCalled();
        expect(http.delete).toHaveBeenCalledWith('/api/workplace_search/account/sources/123');
        await promise;
        expect(setButtonNotLoadingSpy).toHaveBeenCalled();
      });

      it('handles error', async () => {
        const error = {
          response: {
            error: 'this is an error',
            status: 400,
          },
        };
        const promise = Promise.reject(error);
        http.delete.mockReturnValue(promise);
        SourceLogic.actions.removeContentSource(contentSource.id);
        await expectedAsyncError(promise);

        expect(flashAPIErrors).toHaveBeenCalledWith(error);
      });
    });

    it('resetSourceState', () => {
      SourceLogic.actions.resetSourceState();

      expect(clearFlashMessages).toHaveBeenCalled();
    });
  });
});
