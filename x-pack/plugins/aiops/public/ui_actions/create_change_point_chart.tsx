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
import { EMBEDDABLE_CHANGE_POINT_CHART_TYPE } from '@kbn/aiops-change-point-detection/constants';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { AiopsPluginStartDeps } from '../types';
import type { ChangePointChartActionContext } from './change_point_action_context';

const parentApiIsCompatible = async (
  parentApi: unknown
): Promise<PresentationContainer | undefined> => {
  const { apiIsPresentationContainer } = await import('@kbn/presentation-containers');
  // we cannot have an async type check, so return the casted parentApi rather than a boolean
  return apiIsPresentationContainer(parentApi) ? (parentApi as PresentationContainer) : undefined;
};

export function createAddChangePointChartAction(
  coreStart: CoreStart,
  pluginStart: AiopsPluginStartDeps
): UiActionsActionDefinition<ChangePointChartActionContext> {
  return {
    id: 'create-change-point-chart',
    grouping: [
      {
        id: 'ml',
        getDisplayName: () =>
          i18n.translate('xpack.aiops.navMenu.mlAppNameText', {
            defaultMessage: 'Machine Learning',
          }),
        getIconType: () => 'machineLearningApp',
      },
    ],
    getDisplayName: () =>
      i18n.translate('xpack.aiops.embeddableChangePointChartDisplayName', {
        defaultMessage: 'Change point detection',
      }),
    async isCompatible(context: EmbeddableApiContext) {
      return Boolean(await parentApiIsCompatible(context.embeddable));
    },
    async execute(context) {
      const presentationContainerParent = await parentApiIsCompatible(context.embeddable);
      if (!presentationContainerParent) throw new IncompatibleActionError();

      try {
        const { resolveEmbeddableChangePointUserInput } = await import(
          '../embeddables/change_point_chart/resolve_change_point_config_input'
        );

        const initialState = await resolveEmbeddableChangePointUserInput(
          coreStart,
          pluginStart,
          context.embeddable,
          context.embeddable.uuid
        );

        presentationContainerParent.addNewPanel({
          panelType: EMBEDDABLE_CHANGE_POINT_CHART_TYPE,
          initialState,
        });
      } catch (e) {
        return Promise.reject();
      }
    },
  };
}
