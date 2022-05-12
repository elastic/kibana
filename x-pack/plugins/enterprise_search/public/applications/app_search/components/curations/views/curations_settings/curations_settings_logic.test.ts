/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogicMounter, mockHttpValues } from '../../../../../__mocks__/kea_logic';
import '../../../../__mocks__/engine_logic.mock';

jest.mock('../../curations_logic', () => ({
  CurationsLogic: {
    values: {},
    actions: {
      loadCurations: jest.fn(),
    },
  },
}));

import { nextTick } from '@kbn/test-jest-helpers';

import { CurationsLogic } from '../..';
import { itShowsServerErrorAsFlashMessage } from '../../../../../test_helpers';
import { EngineLogic } from '../../../engine';

import { CurationsSettingsLogic } from './curations_settings_logic';

const DEFAULT_VALUES = {
  dataLoading: true,
  curationsSettings: {
    enabled: false,
    mode: 'manual',
  },
};

describe('CurationsSettingsLogic', () => {
  const { mount } = new LogicMounter(CurationsSettingsLogic);
  const { http } = mockHttpValues;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has correct default values', () => {
    mount();
    expect(CurationsSettingsLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('onCurationsSettingsLoad', () => {
      it('saves curation settings and that data has loaded', () => {
        mount();

        CurationsSettingsLogic.actions.onCurationsSettingsLoad({
          enabled: true,
          mode: 'automatic',
        });

        expect(CurationsSettingsLogic.values.dataLoading).toEqual(false);
        expect(CurationsSettingsLogic.values.curationsSettings).toEqual({
          enabled: true,
          mode: 'automatic',
        });
      });
    });

    describe('onSkipCurationsSettingsLoad', () => {
      it('saves that data has loaded', () => {
        mount();

        CurationsSettingsLogic.actions.onSkipLoadingCurationsSettings();

        expect(CurationsSettingsLogic.values.dataLoading).toEqual(false);
      });
    });
  });

  describe('listeners', () => {
    describe('loadCurationsSettings', () => {
      it('calls the curations settings API and saves the returned settings', async () => {
        http.get.mockReturnValueOnce(
          Promise.resolve({
            curation: {
              enabled: true,
              mode: 'automatic',
            },
          })
        );
        mount();
        jest.spyOn(CurationsSettingsLogic.actions, 'onCurationsSettingsLoad');

        CurationsSettingsLogic.actions.loadCurationsSettings();
        await nextTick();

        expect(http.get).toHaveBeenCalledWith(
          '/internal/app_search/engines/some-engine/adaptive_relevance/settings'
        );
        expect(CurationsSettingsLogic.actions.onCurationsSettingsLoad).toHaveBeenCalledWith({
          enabled: true,
          mode: 'automatic',
        });
      });

      itShowsServerErrorAsFlashMessage(http.get, () => {
        CurationsSettingsLogic.actions.loadCurationsSettings();
      });
    });

    describe('toggleCurationsEnabled', () => {
      it('enables curations when they are currently disabled', () => {
        mount({
          curationsSettings: {
            ...DEFAULT_VALUES.curationsSettings,
            enabled: false,
          },
        });
        jest.spyOn(CurationsSettingsLogic.actions, 'updateCurationsSetting');

        CurationsSettingsLogic.actions.toggleCurationsEnabled();

        expect(CurationsSettingsLogic.actions.updateCurationsSetting).toHaveBeenCalledWith({
          enabled: true,
        });
      });

      it('disables curations when they are currently enabled', () => {
        mount({
          curationsSettings: {
            ...DEFAULT_VALUES.curationsSettings,
            enabled: true,
          },
        });
        jest.spyOn(CurationsSettingsLogic.actions, 'updateCurationsSetting');

        CurationsSettingsLogic.actions.toggleCurationsEnabled();

        expect(CurationsSettingsLogic.actions.updateCurationsSetting).toHaveBeenCalledWith({
          enabled: false,
          mode: 'manual',
        });
      });
    });

    describe('toggleCurationsMode', () => {
      it('sets to manual mode when it is currently automatic', () => {
        mount({
          curationsSettings: {
            ...DEFAULT_VALUES.curationsSettings,
            mode: 'automatic',
          },
        });
        jest.spyOn(CurationsSettingsLogic.actions, 'updateCurationsSetting');

        CurationsSettingsLogic.actions.toggleCurationsMode();

        expect(CurationsSettingsLogic.actions.updateCurationsSetting).toHaveBeenCalledWith({
          mode: 'manual',
        });
      });

      it('sets to automatic mode when it is currently manual', () => {
        mount({
          curationsSettings: {
            ...DEFAULT_VALUES.curationsSettings,
            mode: 'manual',
          },
        });
        jest.spyOn(CurationsSettingsLogic.actions, 'updateCurationsSetting');

        CurationsSettingsLogic.actions.toggleCurationsMode();

        expect(CurationsSettingsLogic.actions.updateCurationsSetting).toHaveBeenCalledWith({
          mode: 'automatic',
        });
      });
    });

    describe('updateCurationsSetting', () => {
      it('calls the curations settings API and saves the returned settings', async () => {
        http.put.mockReturnValueOnce(
          Promise.resolve({
            curation: {
              enabled: true,
              mode: 'automatic',
            },
          })
        );
        mount();
        jest.spyOn(CurationsSettingsLogic.actions, 'onCurationsSettingsLoad');

        CurationsSettingsLogic.actions.updateCurationsSetting({
          enabled: true,
        });
        await nextTick();

        expect(http.put).toHaveBeenCalledWith(
          '/internal/app_search/engines/some-engine/adaptive_relevance/settings',
          {
            body: JSON.stringify({
              curation: {
                enabled: true,
              },
            }),
          }
        );
        expect(CurationsSettingsLogic.actions.onCurationsSettingsLoad).toHaveBeenCalledWith({
          enabled: true,
          mode: 'automatic',
        });

        // data should have been reloaded
        expect(EngineLogic.actions.initializeEngine).toHaveBeenCalled();
        expect(CurationsLogic.actions.loadCurations).toHaveBeenCalled();
      });

      itShowsServerErrorAsFlashMessage(http.put, () => {
        CurationsSettingsLogic.actions.updateCurationsSetting({});
      });
    });
  });
});
