/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { PresentationContainer } from '@kbn/presentation-containers';
import { tracksOverlays } from '@kbn/presentation-containers';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { isDefined } from '@kbn/ml-is-defined';
import { COMMON_VISUALIZATION_GROUPING } from '@kbn/visualizations-plugin/public';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import { FIELD_STATS_EMBEDDABLE_TYPE } from '../embeddables/field_stats/constants';
import type { DataVisualizerStartDependencies } from '../../common/types/data_visualizer_plugin';
import type {
  FieldStatisticsTableEmbeddableApi,
  FieldStatsControlsApi,
} from '../embeddables/field_stats/types';
import { FieldStatsInitializerViewType } from '../embeddables/grid_embeddable/types';
import type { FieldStatsInitialState } from '../embeddables/grid_embeddable/types';
import { getOrCreateDataViewByIndexPattern } from '../search_strategy/requests/get_data_view_by_index_pattern';
import { FieldStatisticsInitializer } from '../embeddables/field_stats/field_stats_initializer';

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

async function updatePanelFromFlyoutEdits({
  api,
  isNewPanel,
  deletePanel,
  coreStart,
  pluginStart,
  initialState,
}: {
  api: FieldStatisticsTableEmbeddableApi;
  isNewPanel: boolean;
  deletePanel?: () => void;
  coreStart: CoreStart;
  pluginStart: DataVisualizerStartDependencies;
  initialState: FieldStatsInitialState;
  fieldStatsControlsApi?: FieldStatsControlsApi;
}) {
  const parentApi = api.parentApi;
  const overlayTracker = tracksOverlays(parentApi) ? parentApi : undefined;
  const services = {
    ...coreStart,
    ...pluginStart,
  };
  let hasChanged = false;
  const cancelChanges = () => {
    // Reset to initialState in case user has changed the preview state
    if (hasChanged && api && initialState) {
      api.updateUserInput(initialState);
    }

    if (isNewPanel && deletePanel) {
      deletePanel();
    }
    flyoutSession.close();
    overlayTracker?.clearOverlays();
  };

  const update = async (nextUpdate: FieldStatsInitialState) => {
    const esqlQuery = nextUpdate?.query?.esql;
    if (isDefined(esqlQuery)) {
      const dv = await getOrCreateDataViewByIndexPattern(
        pluginStart.data.dataViews,
        esqlQuery,
        undefined
      );
      if (dv?.id && nextUpdate.dataViewId !== dv.id) {
        nextUpdate.dataViewId = dv.id;
      }
    }
    if (api) {
      api.updateUserInput(nextUpdate);
    }

    flyoutSession.close();
    overlayTracker?.clearOverlays();
  };
  const flyoutSession = services.overlays.openFlyout(
    toMountPoint(
      <KibanaContextProvider services={services}>
        <FieldStatisticsInitializer
          initialInput={initialState}
          onPreview={async (nextUpdate) => {
            if (api.updateUserInput) {
              api.updateUserInput(nextUpdate);
              hasChanged = true;
            }
          }}
          onCreate={update}
          onCancel={cancelChanges}
          isNewPanel={isNewPanel}
        />
      </KibanaContextProvider>,
      coreStart
    ),
    {
      ownFocus: true,
      size: 's',
      paddingSize: 'm',
      hideCloseButton: true,
      type: 'push',
      'data-test-subj': 'fieldStatisticsInitializerFlyout',
      onClose: cancelChanges,
    }
  );
  overlayTracker?.openOverlay(flyoutSession, { focusedPanelId: api.uuid });
}

export function createAddFieldStatsTableAction(
  coreStart: CoreStart,
  pluginStart: DataVisualizerStartDependencies
): UiActionsActionDefinition<FieldStatsActionContext> {
  return {
    id: 'create-field-stats-table',
    grouping: COMMON_VISUALIZATION_GROUPING,
    order: 10,
    getIconType: () => 'fieldStatistics',
    getDisplayName: () =>
      i18n.translate('xpack.dataVisualizer.fieldStatistics.displayName', {
        defaultMessage: 'Field statistics',
      }),
    disabled: !coreStart.uiSettings.get(ENABLE_ESQL),
    async isCompatible(context: EmbeddableApiContext) {
      return (
        Boolean(await parentApiIsCompatible(context.embeddable)) &&
        coreStart.uiSettings.get(ENABLE_ESQL)
      );
    },
    async execute(context) {
      const presentationContainerParent = await parentApiIsCompatible(context.embeddable);
      if (!presentationContainerParent) throw new IncompatibleActionError();

      const isEsqlEnabled = coreStart.uiSettings.get(ENABLE_ESQL);
      try {
        const defaultIndexPattern = await pluginStart.data.dataViews.getDefault();
        const defaultInitialState: FieldStatsInitialState = isEsqlEnabled
          ? {
              viewType: FieldStatsInitializerViewType.ESQL,
              query: {
                // Initial default query
                esql: `from ${defaultIndexPattern?.getIndexPattern()} | limit 10`,
              },
            }
          : {
              viewType: FieldStatsInitializerViewType.DATA_VIEW,
            };
        const embeddable = await presentationContainerParent.addNewPanel<
          object,
          FieldStatisticsTableEmbeddableApi
        >({
          panelType: FIELD_STATS_EMBEDDABLE_TYPE,
          initialState: defaultInitialState,
        });
        // open the flyout if embeddable has been created successfully
        if (embeddable) {
          const deletePanel = () => {
            presentationContainerParent.removePanel(embeddable.uuid);
          };

          updatePanelFromFlyoutEdits({
            api: embeddable,
            isNewPanel: true,
            deletePanel,
            coreStart,
            pluginStart,
            initialState: defaultInitialState,
          });
        }
      } catch (e) {
        return Promise.reject(e);
      }
    },
  };
}
