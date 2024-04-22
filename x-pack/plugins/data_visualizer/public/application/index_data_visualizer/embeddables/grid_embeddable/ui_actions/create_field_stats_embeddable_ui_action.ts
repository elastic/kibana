/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { PresentationContainer } from '@kbn/presentation-containers';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import type { DataVisualizerCoreSetup } from '../../../../common/types/data_visualizer_plugin';
import { FIELD_STATS_ID } from '../constants';
export const PLUGIN_ID = 'ml';
export const PLUGIN_ICON = 'machineLearningApp';
export const ML_APP_NAME = i18n.translate('xpack.ml.navMenu.mlAppNameText', {
  defaultMessage: 'Machine Learning',
});

export const EDIT_SWIMLANE_PANEL_ACTION = 'editSwimlanePanelAction';

export type CreateSwimlanePanelActionContext = EmbeddableApiContext & {
  // embeddable: AnomalySwimLaneEmbeddableApi;
};

const parentApiIsCompatible = async (
  parentApi: unknown
): Promise<PresentationContainer | undefined> => {
  const { apiIsPresentationContainer } = await import('@kbn/presentation-containers');
  // we cannot have an async type check, so return the casted parentApi rather than a boolean
  return apiIsPresentationContainer(parentApi) ? (parentApi as PresentationContainer) : undefined;
};

export function createFieldStatsGridAction(
  getStartServices: DataVisualizerCoreSetup['getStartServices']
): UiActionsActionDefinition<CreateSwimlanePanelActionContext> {
  // @TODO: remove
  console.log(`--@@createFieldStatsGridAction called`, {
    id: 'create-field-stats-table',
    grouping: [
      {
        id: PLUGIN_ID,
        getDisplayName: () => ML_APP_NAME,
        getIconType: () => PLUGIN_ICON,
      },
    ],
    getDisplayName: () =>
      i18n.translate('xpack.dataVisualizer.fieldStatsTable.displayName', {
        defaultMessage: 'Field statistics',
      }),
    getDisplayNameTooltip: () =>
      i18n.translate('xpack.dataVisualizer.fieldStatsTable.description', {
        defaultMessage: 'Visualize field statistics.',
      }),
    async isCompatible(context: EmbeddableApiContext) {
      // @todo fix logic
      return Boolean(true);
    },
    async execute(context) {
      // const presentationContainerParent = await parentApiIsCompatible(context.embeddable);
      // if (!presentationContainerParent) throw new IncompatibleActionError();

      // const [coreStart, deps] = await getStartServices();

      try {
        // const { resolveAnomalySwimlaneUserInput } = await import(
        //   '../embeddables/anomaly_swimlane/anomaly_swimlane_setup_flyout'
        // );

        // const initialState = await resolveAnomalySwimlaneUserInput(coreStart, deps.data.dataViews);
        const initialState = {};
        presentationContainerParent.addNewPanel({
          panelType: FIELD_STATS_ID,
          initialState: {
            ...initialState,
            title: initialState.panelTitle,
          },
        });
      } catch (e) {
        return Promise.reject();
      }
    },
  });
  return {
    id: 'create-field-stats-table',
    grouping: [
      {
        id: PLUGIN_ID,
        getDisplayName: () => ML_APP_NAME,
        getIconType: () => PLUGIN_ICON,
      },
    ],
    getDisplayName: () =>
      i18n.translate('xpack.dataVisualizer.fieldStatsTable.displayName', {
        defaultMessage: 'Field statistics',
      }),
    getDisplayNameTooltip: () =>
      i18n.translate('xpack.dataVisualizer.fieldStatsTable.description', {
        defaultMessage: 'Visualize field statistics.',
      }),
    async isCompatible(context: EmbeddableApiContext) {
      // @todo fix logic
      return Boolean(true);
    },
    async execute(context) {
      const presentationContainerParent = await parentApiIsCompatible(context.embeddable);
      if (!presentationContainerParent) throw new IncompatibleActionError();

      // const [coreStart, deps] = await getStartServices();

      try {
        // const { resolveAnomalySwimlaneUserInput } = await import(
        //   '../embeddables/anomaly_swimlane/anomaly_swimlane_setup_flyout'
        // );

        // const initialState = await resolveAnomalySwimlaneUserInput(coreStart, deps.data.dataViews);
        const initialState = {};
        presentationContainerParent.addNewPanel({
          panelType: 'ml_anomaly_swimlane',
          initialState: {
            ...initialState,
            title: initialState.panelTitle,
          },
        });
      } catch (e) {
        return Promise.reject();
      }
    },
  };
}
