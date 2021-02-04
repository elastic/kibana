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
  expectedAsyncError,
} from '../../../__mocks__';

import { AppLogic } from '../../app_logic';
jest.mock('../../app_logic', () => ({
  AppLogic: { values: { isOrganization: true } },
}));

import { configuredSources, contentSources } from '../../__mocks__/content_sources.mock';

import { SourcesLogic, fetchSourceStatuses, POLLING_INTERVAL } from './sources_logic';

describe('SourcesLogic', () => {
  const { http } = mockHttpValues;
  const { flashAPIErrors, setQueuedSuccessMessage } = mockFlashMessageHelpers;
  const { mount, unmount } = new LogicMounter(SourcesLogic);

  const contentSource = contentSources[0];

  const defaultValues = {
    contentSources: [],
    privateContentSources: [],
    sourceData: [],
    availableSources: [],
    configuredSources: [],
    serviceTypes: [],
    permissionsModal: null,
    dataLoading: true,
    serverStatuses: null,
  };

  const serverStatuses = [
    {
      id: '123',
      name: 'my source',
      service_type: 'github',
      status: {
        status: 'this is a thing',
        synced_at: '2021-01-25',
        error_reason: 1,
      },
    },
  ];

  const serverResponse = {
    contentSources,
    privateContentSources: contentSources,
    serviceTypes: configuredSources,
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mount();
  });

  it('has expected default values', () => {
    expect(SourcesLogic.values).toEqual(defaultValues);
  });

  it('handles unmounting', async () => {
    unmount();
    expect(clearInterval).toHaveBeenCalled();
  });

  describe('actions', () => {
    describe('onInitializeSources', () => {
      it('sets values', () => {
        SourcesLogic.actions.onInitializeSources(serverResponse);

        expect(SourcesLogic.values.contentSources).toEqual(contentSources);
        expect(SourcesLogic.values.privateContentSources).toEqual(contentSources);
        expect(SourcesLogic.values.serviceTypes).toEqual(configuredSources);
        expect(SourcesLogic.values.dataLoading).toEqual(false);
      });

      it('fallbacks', () => {
        SourcesLogic.actions.onInitializeSources({
          contentSources,
          serviceTypes: undefined as any,
        });

        expect(SourcesLogic.values.serviceTypes).toEqual([]);
        expect(SourcesLogic.values.privateContentSources).toEqual([]);
      });
    });

    it('setServerSourceStatuses', () => {
      SourcesLogic.actions.setServerSourceStatuses(serverStatuses);
      const source = serverStatuses[0];

      expect(SourcesLogic.values.serverStatuses).toEqual({
        [source.id]: source.status.status,
      });
    });

    it('onSetSearchability', () => {
      const id = contentSources[0].id;
      const updatedSources = [...contentSources];
      updatedSources[0].searchable = false;
      SourcesLogic.actions.onInitializeSources(serverResponse);
      SourcesLogic.actions.onSetSearchability(id, false);

      expect(SourcesLogic.values.contentSources).toEqual(updatedSources);
      expect(SourcesLogic.values.privateContentSources).toEqual(updatedSources);
    });

    describe('setAddedSource', () => {
      it('configured', () => {
        const name = contentSources[0].name;
        SourcesLogic.actions.setAddedSource(name, false, 'custom');

        expect(SourcesLogic.values.permissionsModal).toEqual({
          addedSourceName: name,
          additionalConfiguration: false,
          serviceType: 'custom',
        });
        expect(setQueuedSuccessMessage).toHaveBeenCalledWith('Successfully connected source. ');
      });

      it('unconfigured', () => {
        const name = contentSources[0].name;
        SourcesLogic.actions.setAddedSource(name, true, 'custom');

        expect(SourcesLogic.values.permissionsModal).toEqual({
          addedSourceName: name,
          additionalConfiguration: true,
          serviceType: 'custom',
        });
        expect(setQueuedSuccessMessage).toHaveBeenCalledWith(
          'Successfully connected source. This source requires additional configuration.'
        );
      });
    });

    it('resetPermissionsModal', () => {
      SourcesLogic.actions.resetPermissionsModal();

      expect(SourcesLogic.values.permissionsModal).toEqual(null);
    });
  });

  describe('listeners', () => {
    describe('initializeSources', () => {
      it('calls API and sets values (org)', async () => {
        AppLogic.values.isOrganization = true;
        const pollForSourceStatusChangesSpy = jest.spyOn(
          SourcesLogic.actions,
          'pollForSourceStatusChanges'
        );
        const onInitializeSourcesSpy = jest.spyOn(SourcesLogic.actions, 'onInitializeSources');
        const promise = Promise.resolve(contentSources);
        http.get.mockReturnValue(promise);
        SourcesLogic.actions.initializeSources();

        expect(http.get).toHaveBeenCalledWith('/api/workplace_search/org/sources');
        await promise;
        expect(pollForSourceStatusChangesSpy).toHaveBeenCalled();
        expect(onInitializeSourcesSpy).toHaveBeenCalledWith(contentSources);
      });

      it('calls API (account)', async () => {
        AppLogic.values.isOrganization = false;
        const promise = Promise.resolve(contentSource);
        http.get.mockReturnValue(promise);
        SourcesLogic.actions.initializeSources();

        expect(http.get).toHaveBeenCalledWith('/api/workplace_search/account/sources');
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
        SourcesLogic.actions.initializeSources();
        await expectedAsyncError(promise);

        expect(flashAPIErrors).toHaveBeenCalledWith(error);
      });
    });

    describe('setSourceSearchability', () => {
      const id = contentSources[0].id;

      it('calls API and sets values (org)', async () => {
        AppLogic.values.isOrganization = true;
        const onSetSearchability = jest.spyOn(SourcesLogic.actions, 'onSetSearchability');
        const promise = Promise.resolve(contentSources);
        http.put.mockReturnValue(promise);
        SourcesLogic.actions.setSourceSearchability(id, true);

        expect(http.put).toHaveBeenCalledWith('/api/workplace_search/org/sources/123/searchable', {
          body: JSON.stringify({ searchable: true }),
        });
        await promise;
        expect(onSetSearchability).toHaveBeenCalledWith(id, true);
      });

      it('calls API (account)', async () => {
        AppLogic.values.isOrganization = false;
        const promise = Promise.resolve(contentSource);
        http.put.mockReturnValue(promise);
        SourcesLogic.actions.setSourceSearchability(id, true);

        expect(http.put).toHaveBeenCalledWith(
          '/api/workplace_search/account/sources/123/searchable',
          {
            body: JSON.stringify({ searchable: true }),
          }
        );
      });

      it('handles error', async () => {
        const error = {
          response: {
            error: 'this is an error',
            status: 400,
          },
        };
        const promise = Promise.reject(error);
        http.put.mockReturnValue(promise);
        SourcesLogic.actions.setSourceSearchability(id, true);
        await expectedAsyncError(promise);

        expect(flashAPIErrors).toHaveBeenCalledWith(error);
      });
    });

    describe('pollForSourceStatusChanges', () => {
      it('calls API and sets values', async () => {
        AppLogic.values.isOrganization = true;
        SourcesLogic.actions.setServerSourceStatuses(serverStatuses);

        const setServerSourceStatusesSpy = jest.spyOn(
          SourcesLogic.actions,
          'setServerSourceStatuses'
        );
        const promise = Promise.resolve(contentSources);
        http.get.mockReturnValue(promise);
        SourcesLogic.actions.pollForSourceStatusChanges();

        jest.advanceTimersByTime(POLLING_INTERVAL);

        expect(http.get).toHaveBeenCalledWith('/api/workplace_search/org/sources/status');
        await promise;
        expect(setServerSourceStatusesSpy).toHaveBeenCalledWith(contentSources);
      });
    });

    it('resetSourcesState', () => {
      SourcesLogic.actions.resetSourcesState();

      expect(clearInterval).toHaveBeenCalled();
    });
  });

  describe('selectors', () => {
    it('availableSources & configuredSources have correct length', () => {
      SourcesLogic.actions.onInitializeSources(serverResponse);

      expect(SourcesLogic.values.availableSources).toHaveLength(1);
      expect(SourcesLogic.values.configuredSources).toHaveLength(5);
    });
  });

  describe('fetchSourceStatuses', () => {
    it('calls API and sets values (org)', async () => {
      const setServerSourceStatusesSpy = jest.spyOn(
        SourcesLogic.actions,
        'setServerSourceStatuses'
      );
      const promise = Promise.resolve(contentSources);
      http.get.mockReturnValue(promise);
      fetchSourceStatuses(true);

      expect(http.get).toHaveBeenCalledWith('/api/workplace_search/org/sources/status');
      await promise;
      expect(setServerSourceStatusesSpy).toHaveBeenCalledWith(contentSources);
    });

    it('calls API (account)', async () => {
      const promise = Promise.resolve(contentSource);
      http.get.mockReturnValue(promise);
      fetchSourceStatuses(false);

      expect(http.get).toHaveBeenCalledWith('/api/workplace_search/account/sources/status');
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
      fetchSourceStatuses(true);
      await expectedAsyncError(promise);

      expect(flashAPIErrors).toHaveBeenCalledWith(error);
    });
  });
});
