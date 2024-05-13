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
import type { AnomalySwimLaneEmbeddableApi } from '../embeddables/anomaly_swimlane/types';
import type { MlCoreSetup } from '../plugin';
import { isSwimLaneEmbeddableContext } from '../embeddables/anomaly_swimlane/types';

export const EDIT_SWIMLANE_PANEL_ACTION = 'editSwimlanePanelAction';

export type EditSwimlanePanelActionContext = EmbeddableApiContext & {
  embeddable: AnomalySwimLaneEmbeddableApi;
};

export function createEditSwimlanePanelAction(
  getStartServices: MlCoreSetup['getStartServices']
): UiActionsActionDefinition<EditSwimlanePanelActionContext> {
  return {
    id: 'edit-anomaly-swimlane',
    type: EDIT_SWIMLANE_PANEL_ACTION,
    order: 50,
    getIconType(): string {
      return 'pencil';
    },
    getDisplayName: () =>
      i18n.translate('xpack.ml.actions.editSwimlaneTitle', {
        defaultMessage: 'Edit swim lane',
      }),
    async execute(context) {
      if (!isSwimLaneEmbeddableContext(context)) {
        throw new IncompatibleActionError();
      }

      const [coreStart, deps] = await getStartServices();

      try {
        const { resolveAnomalySwimlaneUserInput } = await import(
          '../embeddables/anomaly_swimlane/anomaly_swimlane_setup_flyout'
        );

        const { jobIds, viewBy, swimlaneType, panelTitle } = context.embeddable;

        const result = await resolveAnomalySwimlaneUserInput(coreStart, deps.data.dataViews, {
          jobIds: jobIds.getValue(),
          swimlaneType: swimlaneType.getValue(),
          viewBy: viewBy.getValue(),
          title: panelTitle?.getValue(),
        });

        context.embeddable.updateUserInput(result);
        context.embeddable.setPanelTitle(result.panelTitle);
      } catch (e) {
        return Promise.reject();
      }
    },
    async isCompatible(context: EmbeddableApiContext) {
      return (
        isSwimLaneEmbeddableContext(context) &&
        context.embeddable.parentApi?.viewMode?.getValue() === 'edit'
      );
    },
  };
}
