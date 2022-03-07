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

import { nextTick } from '@kbn/test-jest-helpers';

import { EngineCreationLogic } from './engine_creation_logic';

describe('EngineCreationLogic', () => {
  const { mount } = new LogicMounter(EngineCreationLogic);
  const { http } = mockHttpValues;
  const { navigateToUrl } = mockKibanaValues;
  const { flashSuccessToast, flashAPIErrors } = mockFlashMessageHelpers;

  const DEFAULT_VALUES = {
    ingestionMethod: '',
    isLoading: false,
    name: '',
    rawName: '',
    language: 'Universal',
  };

  it('has expected default values', () => {
    mount();
    expect(EngineCreationLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('setIngestionMethod', () => {
      it('sets ingestion method to the provided value', () => {
        mount();
        EngineCreationLogic.actions.setIngestionMethod('crawler');
        expect(EngineCreationLogic.values).toEqual({
          ...DEFAULT_VALUES,
          ingestionMethod: 'crawler',
        });
      });
    });

    describe('setLanguage', () => {
      it('sets language to the provided value', () => {
        mount();
        EngineCreationLogic.actions.setLanguage('English');
        expect(EngineCreationLogic.values).toEqual({
          ...DEFAULT_VALUES,
          language: 'English',
        });
      });
    });

    describe('setRawName', () => {
      beforeAll(() => {
        mount();
        EngineCreationLogic.actions.setRawName('Name__With#$&*%Special--Characters');
      });

      afterAll(() => {
        jest.clearAllMocks();
      });

      it('should set rawName to provided value', () => {
        expect(EngineCreationLogic.values.rawName).toEqual('Name__With#$&*%Special--Characters');
      });

      it('should set name to a sanitized value', () => {
        expect(EngineCreationLogic.values.name).toEqual('name-with-special-characters');
      });
    });

    describe('submitEngine', () => {
      it('sets isLoading to true', () => {
        mount({ isLoading: false });
        EngineCreationLogic.actions.submitEngine();
        expect(EngineCreationLogic.values).toEqual({
          ...DEFAULT_VALUES,
          isLoading: true,
        });
      });
    });

    describe('onSubmitError', () => {
      it('resets isLoading to false', () => {
        mount({ isLoading: true });
        EngineCreationLogic.actions.onSubmitError();
        expect(EngineCreationLogic.values).toEqual({
          ...DEFAULT_VALUES,
          isLoading: false,
        });
      });
    });
  });

  describe('listeners', () => {
    describe('onEngineCreationSuccess', () => {
      beforeAll(() => {
        mount({ language: 'English', rawName: 'test' });
        EngineCreationLogic.actions.onEngineCreationSuccess();
      });

      afterAll(() => {
        jest.clearAllMocks();
      });

      it('should show a success message', () => {
        expect(flashSuccessToast).toHaveBeenCalledWith("Engine 'test' was created");
      });

      it('should navigate the user to the engine page', () => {
        expect(navigateToUrl).toHaveBeenCalledWith('/engines/test');
      });
    });

    describe('submitEngine', () => {
      beforeAll(() => {
        mount({ language: 'English', rawName: 'test' });
      });

      afterAll(() => {
        jest.clearAllMocks();
      });

      it('POSTS to /internal/app_search/engines', () => {
        const body = JSON.stringify({
          name: EngineCreationLogic.values.name,
          language: EngineCreationLogic.values.language,
        });
        EngineCreationLogic.actions.submitEngine();
        expect(http.post).toHaveBeenCalledWith('/internal/app_search/engines', { body });
      });

      it('calls onEngineCreationSuccess on valid submission', async () => {
        jest.spyOn(EngineCreationLogic.actions, 'onEngineCreationSuccess');
        http.post.mockReturnValueOnce(Promise.resolve({}));
        EngineCreationLogic.actions.submitEngine();
        await nextTick();
        expect(EngineCreationLogic.actions.onEngineCreationSuccess).toHaveBeenCalledTimes(1);
      });

      it('calls flashAPIErrors on API Error', async () => {
        http.post.mockReturnValueOnce(Promise.reject());
        EngineCreationLogic.actions.submitEngine();
        await nextTick();
        expect(flashAPIErrors).toHaveBeenCalledTimes(1);
      });
    });
  });
});
