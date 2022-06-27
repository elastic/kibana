/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { flashAPIErrors } from '../../../../../shared/flash_messages';
import { HttpLogic } from '../../../../../shared/http';
import { EngineLogic } from '../../../engine';
import { CurationsLogic } from '../../curations_logic';

export interface CurationsSettings {
  enabled: boolean;
  mode: 'automatic' | 'manual';
}

interface CurationsSettingsValues {
  dataLoading: boolean;
  curationsSettings: CurationsSettings;
}

interface CurationsSettingsActions {
  loadCurationsSettings(): void;
  onCurationsSettingsLoad(curationsSettings: CurationsSettings): {
    curationsSettings: CurationsSettings;
  };
  onSkipLoadingCurationsSettings(): void;
  toggleCurationsEnabled(): void;
  toggleCurationsMode(): void;
  updateCurationsSetting(currationsSetting: Partial<CurationsSettings>): {
    currationsSetting: Partial<CurationsSettings>;
  };
}

export const CurationsSettingsLogic = kea<
  MakeLogicType<CurationsSettingsValues, CurationsSettingsActions>
>({
  path: ['enterprise_search', 'app_search', 'curations', 'curations_settings_logic'],
  actions: () => ({
    loadCurationsSettings: true,
    onCurationsSettingsLoad: (curationsSettings) => ({ curationsSettings }),
    onSkipLoadingCurationsSettings: true,
    toggleCurationsEnabled: true,
    toggleCurationsMode: true,
    updateCurationsSetting: (currationsSetting) => ({ currationsSetting }),
  }),
  reducers: () => ({
    dataLoading: [
      true,
      {
        onCurationsSettingsLoad: () => false,
        onSkipLoadingCurationsSettings: () => false,
      },
    ],
    curationsSettings: [
      {
        enabled: false,
        mode: 'manual',
      },
      {
        onCurationsSettingsLoad: (_, { curationsSettings }) => curationsSettings,
      },
    ],
  }),
  listeners: ({ actions, values }) => ({
    loadCurationsSettings: async () => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;

      try {
        const response = await http.get<{ curation: CurationsSettings }>(
          `/internal/app_search/engines/${engineName}/adaptive_relevance/settings`
        );
        actions.onCurationsSettingsLoad(response.curation);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    toggleCurationsEnabled: async () => {
      if (values.curationsSettings.enabled) {
        actions.updateCurationsSetting({ enabled: false, mode: 'manual' });
      } else {
        actions.updateCurationsSetting({ enabled: true });
      }
    },
    toggleCurationsMode: async () => {
      actions.updateCurationsSetting({
        mode: values.curationsSettings.mode === 'automatic' ? 'manual' : 'automatic',
      });
    },
    updateCurationsSetting: async ({ currationsSetting }) => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;
      try {
        const response = await http.put<{ curation: CurationsSettings }>(
          `/internal/app_search/engines/${engineName}/adaptive_relevance/settings`,
          {
            body: JSON.stringify({ curation: currationsSetting }),
          }
        );
        actions.onCurationsSettingsLoad(response.curation);

        //  Re-fetch data so that UI updates to new settings
        CurationsLogic.actions.loadCurations();
        EngineLogic.actions.initializeEngine();
      } catch (e) {
        flashAPIErrors(e);
      }
    },
  }),
});
