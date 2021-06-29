/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generatePath } from 'react-router-dom';

import { kea, MakeLogicType } from 'kea';

import { flashAPIErrors, flashSuccessToast } from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import { KibanaLogic } from '../../../shared/kibana';
import { ENGINE_PATH } from '../../routes';
import { ENGINE_CREATION_SUCCESS_MESSAGE } from '../engine_creation/constants';

interface SampleEngineCreationCtaActions {
  createSampleEngine(): void;
  onSampleEngineCreationSuccess(): void;
  onSampleEngineCreationFailure(): void;
  setIsLoading(isLoading: boolean): { isLoading: boolean };
}

interface SampleEngineCreationCtaValues {
  isLoading: boolean;
}

export const SampleEngineCreationCtaLogic = kea<
  MakeLogicType<SampleEngineCreationCtaValues, SampleEngineCreationCtaActions>
>({
  path: ['enterprise_search', 'app_search', 'sample_engine_cta_logic'],
  actions: {
    createSampleEngine: true,
    onSampleEngineCreationSuccess: true,
    onSampleEngineCreationFailure: true,
  },
  reducers: {
    isLoading: [
      false,
      {
        createSampleEngine: () => true,
        onSampleEngineCreationSuccess: () => false,
        onSampleEngineCreationFailure: () => false,
      },
    ],
  },
  listeners: ({ actions }) => ({
    createSampleEngine: async () => {
      const { http } = HttpLogic.values;

      const body = JSON.stringify({ seed_sample_engine: true });

      try {
        await http.post('/api/app_search/onboarding_complete', {
          body,
        });
        actions.onSampleEngineCreationSuccess();
      } catch (e) {
        actions.onSampleEngineCreationFailure();
        flashAPIErrors(e);
      }
    },
    onSampleEngineCreationSuccess: () => {
      const { navigateToUrl } = KibanaLogic.values;
      const enginePath = generatePath(ENGINE_PATH, { engineName: 'national-parks-demo' });

      flashSuccessToast(ENGINE_CREATION_SUCCESS_MESSAGE('national-parks-demo'));
      navigateToUrl(enginePath);
    },
  }),
});
