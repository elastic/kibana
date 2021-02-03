/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  LogicMounter,
  mockHttpValues,
  mockKibanaValues,
  mockFlashMessageHelpers,
} from '../../../__mocks__';

import { nextTick } from '@kbn/test/jest';
import { generatePath } from 'react-router-dom';

import { ENGINE_PATH } from '../../routes';
import { formatApiName } from '../../utils/format_api_name';

import { ENGINE_CREATION_SUCCESS_MESSAGE } from './constants';
import { EngineCreationLogic } from './engine_creation_logic';

describe('EngineCreationLogic', () => {
  const { mount } = new LogicMounter(EngineCreationLogic);
  const { http } = mockHttpValues;
  const { navigateToUrl } = mockKibanaValues;
  const { setQueuedSuccessMessage, flashAPIErrors } = mockFlashMessageHelpers;

  const DEFAULT_VALUES = {
    name: '',
    rawName: '',
    language: 'Universal',
  };

  it('has expected default values', () => {
    mount();
    expect(EngineCreationLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
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

      describe('rawName', () => {
        it('should be set to provided value', () => {
          expect(EngineCreationLogic.values.rawName).toEqual('Name__With#$&*%Special--Characters');
        });
      });

      describe('name', () => {
        it('should be set to a sanitized value', () => {
          expect(EngineCreationLogic.values.name).toEqual('name-with-special-characters');
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

      it('should set a success message', () => {
        expect(setQueuedSuccessMessage).toHaveBeenCalledWith('Successfully created engine.');
      });

      it('should navigate the user to the engine page', () => {
        expect(navigateToUrl).toHaveBeenCalledWith('/engines/test');
      });
    });

    describe('submitEngine', () => {
      beforeAll(() => {
        mount({ language: 'English', rawName: 'test' });
      });

      it('POSTS to /api/app_search/engines', () => {
        const body = JSON.stringify({
          name: EngineCreationLogic.values.name,
          language: EngineCreationLogic.values.language,
        });
        EngineCreationLogic.actions.submitEngine();
        expect(http.post).toHaveBeenCalledWith('/api/app_search/engines', { body });
      });

      it('calls onEngineCreationSuccess on valid submission', async () => {
        jest.spyOn(EngineCreationLogic.actions, 'onEngineCreationSuccess');
        http.post.mockReturnValueOnce(Promise.resolve({}));
        await EngineCreationLogic.actions.submitEngine();
        await nextTick();
        expect(EngineCreationLogic.actions.onEngineCreationSuccess).toHaveBeenCalledTimes(1);
      });

      it('calls flashAPIErrors on API Error', async () => {
        http.post.mockReturnValueOnce(Promise.reject());
        await EngineCreationLogic.actions.submitEngine();
        await nextTick();
        expect(flashAPIErrors).toHaveBeenCalledTimes(1);
      });
    });
  });
});
