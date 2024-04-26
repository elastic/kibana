/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { PresentationContainer } from '@kbn/presentation-containers';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { UiActionsActionDefinition, UiActionsSetup } from '@kbn/ui-actions-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { FIELD_STATS_EMBED_ID, CREATE_FIELD_STATS_ACTION_ID } from '../constants';

const PLUGIN_ID = 'ml';
const PLUGIN_ICON = 'machineLearningApp';
const ML_APP_NAME = i18n.translate('xpack.ml.navMenu.mlAppNameText', {
  defaultMessage: 'Machine Learning',
});

const parentApiIsCompatible = async (
  parentApi: unknown
): Promise<PresentationContainer | undefined> => {
  const { apiIsPresentationContainer } = await import('@kbn/presentation-containers');
  // we cannot have an async type check, so return the casted parentApi rather than a boolean
  return apiIsPresentationContainer(parentApi) ? (parentApi as PresentationContainer) : undefined;
};

interface FieldStatsAction {
  // Need to make this unknown to prevent circular dependencies.
  // Apps using this property will need to cast to `IEmbeddable`.
  embeddable?: unknown;
}
function createFieldStatsGridAction(): UiActionsActionDefinition<FieldStatsAction> {
  return {
    id: CREATE_FIELD_STATS_ACTION_ID,
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
      return true;
    },
    async execute(context) {
      const presentationContainerParent = await parentApiIsCompatible(context.embeddable);
      if (!presentationContainerParent) throw new IncompatibleActionError();

      try {
        const initialState = { panelTitle: 'Field statistics' };
        presentationContainerParent.addNewPanel({
          panelType: FIELD_STATS_EMBED_ID,
          initialState: {
            title: initialState.panelTitle,
          },
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        return Promise.reject();
      }
    },
  };
}

export function registerFieldStatsUIActions(uiActions: UiActionsSetup) {
  const createFieldStatsAction = createFieldStatsGridAction();
  uiActions.registerAction(createFieldStatsAction);
  uiActions.attachAction('ADD_PANEL_TRIGGER', CREATE_FIELD_STATS_ACTION_ID);
}
