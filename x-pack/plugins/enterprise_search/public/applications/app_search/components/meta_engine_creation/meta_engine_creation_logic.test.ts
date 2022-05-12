/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LogicMounter,
  mockHttpValues,
  mockFlashMessageHelpers,
  mockKibanaValues,
} from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { MetaEngineCreationLogic } from './meta_engine_creation_logic';

describe('MetaEngineCreationLogic', () => {
  const { mount } = new LogicMounter(MetaEngineCreationLogic);
  const { http } = mockHttpValues;
  const { navigateToUrl } = mockKibanaValues;
  const { flashSuccessToast, flashAPIErrors } = mockFlashMessageHelpers;

  const DEFAULT_VALUES = {
    isLoading: false,
    indexedEngineNames: [],
    name: '',
    rawName: '',
    selectedIndexedEngineNames: [],
  };

  it('has expected default values', () => {
    mount();
    expect(MetaEngineCreationLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('setRawName', () => {
      beforeAll(() => {
        jest.clearAllMocks();
        mount();
        MetaEngineCreationLogic.actions.setRawName('Name__With#$&*%Special--Characters');
      });

      it('should set rawName to provided value', () => {
        expect(MetaEngineCreationLogic.values.rawName).toEqual(
          'Name__With#$&*%Special--Characters'
        );
      });

      it('should set name to a sanitized value', () => {
        expect(MetaEngineCreationLogic.values.name).toEqual('name-with-special-characters');
      });
    });

    describe('setIndexedEngineNames', () => {
      it('should set indexedEngineNames to provided value', () => {
        mount();
        MetaEngineCreationLogic.actions.setIndexedEngineNames(['first', 'middle', 'last']);
        expect(MetaEngineCreationLogic.values.indexedEngineNames).toEqual([
          'first',
          'middle',
          'last',
        ]);
      });
    });

    describe('setSelectedIndexedEngineNames', () => {
      it('should set selectedIndexedEngineNames to provided value', () => {
        mount();
        MetaEngineCreationLogic.actions.setSelectedIndexedEngineNames(['one', 'two', 'three']);
        expect(MetaEngineCreationLogic.values.selectedIndexedEngineNames).toEqual([
          'one',
          'two',
          'three',
        ]);
      });
    });

    describe('submitEngine', () => {
      it('sets isLoading to true', () => {
        mount({ isLoading: false });
        MetaEngineCreationLogic.actions.submitEngine();
        expect(MetaEngineCreationLogic.values).toEqual({
          ...DEFAULT_VALUES,
          isLoading: true,
        });
      });
    });

    describe('onSubmitError', () => {
      it('resets isLoading to false', () => {
        mount({ isLoading: true });
        MetaEngineCreationLogic.actions.onSubmitError();
        expect(MetaEngineCreationLogic.values).toEqual({
          ...DEFAULT_VALUES,
          isLoading: false,
        });
      });
    });
  });

  describe('listeners', () => {
    describe('fetchIndexedEngineNames', () => {
      beforeEach(() => {
        mount();
        jest.clearAllMocks();
      });

      it('calls flashAPIErrors on API Error', async () => {
        http.get.mockReturnValueOnce(Promise.reject());
        MetaEngineCreationLogic.actions.fetchIndexedEngineNames();
        await nextTick();
        expect(flashAPIErrors).toHaveBeenCalledTimes(1);
      });

      it('calls onEngineCreationSuccess on valid submission', async () => {
        jest.spyOn(MetaEngineCreationLogic.actions, 'setIndexedEngineNames');
        http.get.mockReturnValueOnce(
          Promise.resolve({ results: [{ name: 'foo' }], meta: { page: { total_pages: 1 } } })
        );
        MetaEngineCreationLogic.actions.fetchIndexedEngineNames();
        await nextTick();
        expect(MetaEngineCreationLogic.actions.setIndexedEngineNames).toHaveBeenCalledWith(['foo']);
      });

      it('filters out elasticsearch type engines', async () => {
        jest.spyOn(MetaEngineCreationLogic.actions, 'setIndexedEngineNames');
        http.get.mockReturnValueOnce(
          Promise.resolve({
            results: [
              { name: 'foo', type: 'default' },
              { name: 'elasticsearch-engine', type: 'elasticsearch' },
            ],
            meta: { page: { total_pages: 1 } },
          })
        );
        MetaEngineCreationLogic.actions.fetchIndexedEngineNames();
        await nextTick();
        expect(MetaEngineCreationLogic.actions.setIndexedEngineNames).toHaveBeenCalledWith(['foo']);
      });

      it('if there are remaining pages it should call fetchIndexedEngineNames recursively with an incremented page', async () => {
        jest.spyOn(MetaEngineCreationLogic.actions, 'fetchIndexedEngineNames');
        http.get.mockReturnValueOnce(
          Promise.resolve({ results: [{ name: 'foo' }], meta: { page: { total_pages: 2 } } })
        );
        MetaEngineCreationLogic.actions.fetchIndexedEngineNames();
        await nextTick();
        expect(MetaEngineCreationLogic.actions.fetchIndexedEngineNames).toHaveBeenCalledWith(2);
      });

      it('if there are no remaining pages it should end without calling recursively', async () => {
        jest.spyOn(MetaEngineCreationLogic.actions, 'fetchIndexedEngineNames');
        http.get.mockReturnValueOnce(
          Promise.resolve({ results: [{ name: 'foo' }], meta: { page: { total_pages: 1 } } })
        );
        MetaEngineCreationLogic.actions.fetchIndexedEngineNames();
        await nextTick();
        expect(MetaEngineCreationLogic.actions.fetchIndexedEngineNames).toHaveBeenCalledTimes(1); // it's one time cause we called it two lines above
      });
    });

    describe('onEngineCreationSuccess', () => {
      beforeAll(() => {
        jest.clearAllMocks();
        mount({ language: 'English', rawName: 'test' });
        MetaEngineCreationLogic.actions.onEngineCreationSuccess();
      });

      it('should show a success message', () => {
        expect(flashSuccessToast).toHaveBeenCalledWith("Meta engine 'test' was created");
      });

      it('should navigate the user to the engine page', () => {
        expect(navigateToUrl).toHaveBeenCalledWith('/engines/test');
      });
    });

    describe('submitEngine', () => {
      beforeAll(() => {
        jest.clearAllMocks();
        mount({ rawName: 'test', selectedIndexedEngineNames: ['foo'] });
      });

      it('POSTS to /internal/app_search/engines', () => {
        const body = JSON.stringify({
          name: 'test',
          type: 'meta',
          source_engines: ['foo'],
        });
        MetaEngineCreationLogic.actions.submitEngine();
        expect(http.post).toHaveBeenCalledWith('/internal/app_search/engines', { body });
      });

      it('calls onEngineCreationSuccess on valid submission', async () => {
        jest.spyOn(MetaEngineCreationLogic.actions, 'onEngineCreationSuccess');
        http.post.mockReturnValueOnce(Promise.resolve({}));
        MetaEngineCreationLogic.actions.submitEngine();
        await nextTick();
        expect(MetaEngineCreationLogic.actions.onEngineCreationSuccess).toHaveBeenCalledTimes(1);
      });

      it('calls flashAPIErrors on API Error', async () => {
        jest.spyOn(MetaEngineCreationLogic.actions, 'setIndexedEngineNames');
        http.post.mockReturnValueOnce(Promise.reject());
        MetaEngineCreationLogic.actions.submitEngine();
        await nextTick();
        expect(flashAPIErrors).toHaveBeenCalledTimes(1);
        expect(MetaEngineCreationLogic.actions.setIndexedEngineNames).not.toHaveBeenCalled();
      });
    });
  });
});
