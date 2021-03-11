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
} from '../../../__mocks__';

import { nextTick } from '@kbn/test/jest';

import { SampleEngineCreationCtaLogic } from './sample_engine_creation_cta_logic';

describe('SampleEngineCreationCtaLogic', () => {
  const { mount } = new LogicMounter(SampleEngineCreationCtaLogic);
  const { http } = mockHttpValues;
  const { navigateToUrl } = mockKibanaValues;
  const { setQueuedSuccessMessage, flashAPIErrors } = mockFlashMessageHelpers;

  const DEFAULT_VALUES = {
    isLoading: false,
  };

  it('has expected default values', () => {
    mount();
    expect(SampleEngineCreationCtaLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    it('setIsLoading sets isLoading', () => {
      jest.clearAllMocks();
      mount();

      SampleEngineCreationCtaLogic.actions.setIsLoading(true);

      expect(SampleEngineCreationCtaLogic.values.isLoading).toEqual(true);
    });
  });

  describe('listeners', () => {
    describe('createSampleEngine', () => {
      beforeAll(() => {
        mount();
      });

      afterAll(() => {
        jest.clearAllMocks();
      });

      it('POSTS to /api/app_search/engines', () => {
        const body = JSON.stringify({
          seed_sample_engine: true,
        });
        SampleEngineCreationCtaLogic.actions.createSampleEngine();
        expect(http.post).toHaveBeenCalledWith('/api/app_search/onboarding_complete', { body });
      });

      it('calls onSampleEngineCreationSuccess on valid submission', async () => {
        jest.spyOn(SampleEngineCreationCtaLogic.actions, 'onSampleEngineCreationSuccess');
        http.post.mockReturnValueOnce(Promise.resolve({}));
        SampleEngineCreationCtaLogic.actions.createSampleEngine();
        await nextTick();
        expect(
          SampleEngineCreationCtaLogic.actions.onSampleEngineCreationSuccess
        ).toHaveBeenCalledTimes(1);
      });

      it('calls flashAPIErrors on API Error', async () => {
        http.post.mockReturnValueOnce(Promise.reject());
        SampleEngineCreationCtaLogic.actions.createSampleEngine();
        await nextTick();
        expect(flashAPIErrors).toHaveBeenCalledTimes(1);
      });
    });

    describe('onSampleEngineCreationSuccess', () => {
      beforeAll(() => {
        mount();
        SampleEngineCreationCtaLogic.actions.onSampleEngineCreationSuccess();
      });

      afterAll(() => {
        jest.clearAllMocks();
      });

      it('should set a success message', () => {
        expect(setQueuedSuccessMessage).toHaveBeenCalledWith('Successfully created engine.');
      });

      it('should navigate the user to the engine page', () => {
        expect(navigateToUrl).toHaveBeenCalledWith('/engines/national-parks-demo');
      });
    });
  });
});
