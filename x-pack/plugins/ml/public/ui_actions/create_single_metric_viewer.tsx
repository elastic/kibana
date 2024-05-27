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
import { HttpService } from '../application/services/http_service';
import type { MlApiServices } from '../application/services/ml_api_service';
import { ML_APP_NAME, PLUGIN_ICON, PLUGIN_ID } from '../../common/constants/app';
import { ANOMALY_SINGLE_METRIC_VIEWER_EMBEDDABLE_TYPE } from '../embeddables';
import type { SingleMetricViewerEmbeddableApi } from '../embeddables/types';
import type { MlCoreSetup } from '../plugin';

export type CreateSingleMetricViewerPanelActionContext = EmbeddableApiContext & {
  embeddable: SingleMetricViewerEmbeddableApi;
};

const parentApiIsCompatible = async (
  parentApi: unknown
): Promise<PresentationContainer | undefined> => {
  const { apiIsPresentationContainer } = await import('@kbn/presentation-containers');
  // we cannot have an async type check, so return the casted parentApi rather than a boolean
  return apiIsPresentationContainer(parentApi) ? (parentApi as PresentationContainer) : undefined;
};

export function createAddSingleMetricViewerPanelAction(
  getStartServices: MlCoreSetup['getStartServices']
): UiActionsActionDefinition<CreateSingleMetricViewerPanelActionContext> {
  // @ts-ignore
  return {
    id: 'create-single-metric-viewer',
    grouping: [
      {
        id: PLUGIN_ID,
        getDisplayName: () => ML_APP_NAME,
        getIconType: () => PLUGIN_ICON,
      },
    ],
    getDisplayName: () =>
      i18n.translate('xpack.ml.components.singleMetricViewerEmbeddable.displayName', {
        defaultMessage: 'Single metric viewer',
      }),
    getDisplayNameTooltip: () =>
      i18n.translate('xpack.ml.components.singleMetricViewerEmbeddable.description', {
        defaultMessage:
          'View anomaly detection results for a single metric on a focused date range.',
      }),
    async isCompatible(context: EmbeddableApiContext) {
      return Boolean(await parentApiIsCompatible(context.embeddable));
    },
    async execute(context) {
      const presentationContainerParent = await parentApiIsCompatible(context.embeddable);
      if (!presentationContainerParent) throw new IncompatibleActionError();

      const [coreStart, { data, share }] = await getStartServices();

      try {
        const { resolveEmbeddableSingleMetricViewerUserInput } = await import(
          '../embeddables/single_metric_viewer/single_metric_viewer_setup_flyout'
        );
        const { mlApiServicesProvider } = await import('../application/services/ml_api_service');
        const httpService = new HttpService(coreStart.http);
        const mlApiServices: MlApiServices = mlApiServicesProvider(httpService);

        const initialState = await resolveEmbeddableSingleMetricViewerUserInput(
          coreStart,
          context.embeddable,
          context.embeddable.uuid,
          { data, share },
          mlApiServices
        );

        presentationContainerParent.addNewPanel({
          panelType: ANOMALY_SINGLE_METRIC_VIEWER_EMBEDDABLE_TYPE,
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
