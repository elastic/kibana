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

export interface CurationsSettings {
  enabled: boolean;
  mode: 'automated' | 'manual';
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
    toggleCurationsEnabled: true,
    toggleCurationsMode: true,
    updateCurationsSetting: (currationsSetting) => ({ currationsSetting }),
  }),
  reducers: () => ({
    dataLoading: [
      true,
      {
        onCurationsSettingsLoad: () => false,
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
        const response = await http.get(
          `/internal/app_search/engines/${engineName}/search_relevance_insights/settings`
        );
        actions.onCurationsSettingsLoad(response.curation);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    toggleCurationsEnabled: async () => {
      actions.updateCurationsSetting({ enabled: !values.curationsSettings.enabled });
    },
    toggleCurationsMode: async () => {
      actions.updateCurationsSetting({
        mode: values.curationsSettings.mode === 'automated' ? 'manual' : 'automated',
      });
    },
    updateCurationsSetting: async ({ currationsSetting }) => {
      const { http } = HttpLogic.values;
      const { engineName } = EngineLogic.values;
      try {
        const response = await http.put(
          `/internal/app_search/engines/${engineName}/search_relevance_insights/settings`,
          {
            body: JSON.stringify({ curation: currationsSetting }),
          }
        );
        actions.onCurationsSettingsLoad(response.curation);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
  }),
});
