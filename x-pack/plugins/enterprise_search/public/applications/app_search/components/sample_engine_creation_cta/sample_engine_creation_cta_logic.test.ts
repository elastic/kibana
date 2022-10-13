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

import { SampleEngineCreationCtaLogic } from './sample_engine_creation_cta_logic';

describe('SampleEngineCreationCtaLogic', () => {
  const { mount } = new LogicMounter(SampleEngineCreationCtaLogic);
  const { http } = mockHttpValues;
  const { navigateToUrl } = mockKibanaValues;
  const { flashSuccessToast, flashAPIErrors } = mockFlashMessageHelpers;

  const DEFAULT_VALUES = {
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mount();
  });

  it('has expected default values', () => {
    expect(SampleEngineCreationCtaLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    it('onSampleEngineCreationFailure sets isLoading to false', () => {
      mount({ isLoading: true });

      SampleEngineCreationCtaLogic.actions.onSampleEngineCreationFailure();

      expect(SampleEngineCreationCtaLogic.values.isLoading).toEqual(false);
    });
  });

  describe('listeners', () => {
    describe('createSampleEngine', () => {
      it('POSTS to /internal/app_search/engines', () => {
        const body = JSON.stringify({
          seed_sample_engine: true,
        });
        SampleEngineCreationCtaLogic.actions.createSampleEngine();

        expect(http.post).toHaveBeenCalledWith('/internal/app_search/onboarding_complete', {
          body,
        });
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

      it('calls onSampleEngineCreationFailure and flashAPIErrors on API Error', async () => {
        jest.spyOn(SampleEngineCreationCtaLogic.actions, 'onSampleEngineCreationFailure');
        http.post.mockReturnValueOnce(Promise.reject());

        SampleEngineCreationCtaLogic.actions.createSampleEngine();
        await nextTick();

        expect(flashAPIErrors).toHaveBeenCalledTimes(1);
        expect(
          SampleEngineCreationCtaLogic.actions.onSampleEngineCreationFailure
        ).toHaveBeenCalledTimes(1);
      });
    });

    it('onSampleEngineCreationSuccess should show a success message and navigate the user to the engine page', () => {
      SampleEngineCreationCtaLogic.actions.onSampleEngineCreationSuccess();

      expect(flashSuccessToast).toHaveBeenCalledWith("Engine 'national-parks-demo' was created");
      expect(navigateToUrl).toHaveBeenCalledWith('/engines/national-parks-demo');
    });
  });
});
