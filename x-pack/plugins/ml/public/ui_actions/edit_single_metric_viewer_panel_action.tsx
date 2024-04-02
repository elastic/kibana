/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { isSingleMetricViewerEmbeddableContext } from './open_in_single_metric_viewer_action';
import type { MlCoreSetup } from '../plugin';
import { HttpService } from '../application/services/http_service';
import type {
  SingleMetricViewerEmbeddableInput,
  SingleMetricViewerEmbeddableApi,
} from '../embeddables/types';

export const EDIT_SINGLE_METRIC_VIEWER_PANEL_ACTION = 'editSingleMetricViewerPanelAction';

export type EditSingleMetricViewerPanelActionContext = EmbeddableApiContext & {
  embeddable: SingleMetricViewerEmbeddableApi;
};

export function createEditSingleMetricViewerPanelAction(
  getStartServices: MlCoreSetup['getStartServices']
): UiActionsActionDefinition<EditSingleMetricViewerPanelActionContext> {
  return {
    id: 'edit-single-metric-viewer',
    type: EDIT_SINGLE_METRIC_VIEWER_PANEL_ACTION,
    order: 50,
    getIconType(): string {
      return 'pencil';
    },
    getDisplayName: () =>
      i18n.translate('xpack.ml.actions.editSingleMetricViewerTitle', {
        defaultMessage: 'Edit single metric viewer',
      }),
    async execute(context) {
      if (!isSingleMetricViewerEmbeddableContext(context)) {
        throw new IncompatibleActionError();
      }

      const [coreStart, pluginStart] = await getStartServices();

      try {
        const { resolveEmbeddableSingleMetricViewerUserInput } = await import(
          '../embeddables/single_metric_viewer/single_metric_viewer_setup_flyout'
        );

        const { mlApiServicesProvider } = await import('../application/services/ml_api_service');
        const httpService = new HttpService(coreStart.http);
        const mlApiServices = mlApiServicesProvider(httpService);

        const { jobIds, selectedEntities, selectedDetectorIndex } = context.embeddable;

        const result = await resolveEmbeddableSingleMetricViewerUserInput(
          coreStart,
          pluginStart,
          mlApiServices,
          {
            jobIds: jobIds.getValue(),
            selectedDetectorIndex: selectedDetectorIndex.getValue(),
            selectedEntities: selectedEntities?.getValue(),
          } as SingleMetricViewerEmbeddableInput
        );

        context.embeddable.updateUserInput(result);
        context.embeddable.setPanelTitle(result.panelTitle);
      } catch (e) {
        return Promise.reject();
      }
    },
    async isCompatible(context: EmbeddableApiContext) {
      return (
        isSingleMetricViewerEmbeddableContext(context) &&
        context.embeddable.viewMode?.getValue() === 'edit'
      );
    },
  };
}
