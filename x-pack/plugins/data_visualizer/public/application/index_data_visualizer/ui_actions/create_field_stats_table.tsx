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
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { getESQLWithSafeLimit } from '@kbn/esql-utils';
import { FIELD_STATS_EMBEDDABLE_TYPE } from '../embeddables/field_stats/constants';
import type { DataVisualizerStartDependencies } from '../../common/types/data_visualizer_plugin';
import type { FieldStatisticsTableEmbeddableApi } from '../embeddables/field_stats/types';

const parentApiIsCompatible = async (
  parentApi: unknown
): Promise<PresentationContainer | undefined> => {
  const { apiIsPresentationContainer } = await import('@kbn/presentation-containers');
  // we cannot have an async type check, so return the casted parentApi rather than a boolean
  return apiIsPresentationContainer(parentApi) ? (parentApi as PresentationContainer) : undefined;
};

interface FieldStatsActionContext extends EmbeddableApiContext {
  embeddable: FieldStatisticsTableEmbeddableApi;
}
export function createAddFieldStatsTableAction(
  coreStart: CoreStart,
  pluginStart: DataVisualizerStartDependencies
): UiActionsActionDefinition<FieldStatsActionContext> {
  return {
    id: 'create-field-stats-table',
    getIconType: () => 'inspect',
    getDisplayName: () =>
      i18n.translate('xpack.dataVisualizer.fieldStatistics.displayName', {
        defaultMessage: 'Field statistics',
      }),
    async isCompatible(context: EmbeddableApiContext) {
      return Boolean(await parentApiIsCompatible(context.embeddable));
    },
    async execute(context) {
      const presentationContainerParent = await parentApiIsCompatible(context.embeddable);
      if (!presentationContainerParent) throw new IncompatibleActionError();

      try {
        const { resolveEmbeddableFieldStatsUserInput } = await import(
          '../embeddables/field_stats/resolve_field_stats_embeddable_input'
        );

        const defaultIndexPattern = await pluginStart.data.dataViews.getDefault();

        const initialState = await resolveEmbeddableFieldStatsUserInput(
          coreStart,
          pluginStart,
          context.embeddable,
          context.embeddable.uuid,
          defaultIndexPattern
            ? {
                query: {
                  esql: getESQLWithSafeLimit(`from ${defaultIndexPattern?.getIndexPattern()}`, 10),
                },
              }
            : undefined
        );

        presentationContainerParent.addNewPanel({
          panelType: FIELD_STATS_EMBEDDABLE_TYPE,
          initialState,
        });
      } catch (e) {
        return Promise.reject(e);
      }
    },
  };
}
