/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { ActionContextMapping, createAction } from '../../../../../src/plugins/ui_actions/public';
import { IEmbeddable } from '../../../../../src/plugins/embeddable/public';
import {
  AnomalySwimlaneEmbeddable,
  AnomalySwimlaneEmbeddableInput,
  AnomalySwimlaneEmbeddableOutput,
} from '../embeddables/anomaly_swimlane/anomaly_swimlane_embeddable';
import { resolveAnomalySwimlaneUserInput } from '../embeddables/anomaly_swimlane/anomaly_swimlane_setup_flyout';
import { HttpService } from '../application/services/http_service';
import { AnomalyDetectorService } from '../application/services/anomaly_detector_service';

export const EDIT_SWIMLANE_PANEL_ACTION = 'editSwimlanePanelAction';

export interface EditSwimlanePanelContext {
  embeddable: IEmbeddable<AnomalySwimlaneEmbeddableInput, AnomalySwimlaneEmbeddableOutput>;
}

export function createEditSwimlanePanelAction(getStartServices: CoreSetup['getStartServices']) {
  return createAction<typeof EDIT_SWIMLANE_PANEL_ACTION>({
    id: 'edit-anomaly-swimlane',
    type: EDIT_SWIMLANE_PANEL_ACTION,
    getIconType(context: ActionContextMapping[typeof EDIT_SWIMLANE_PANEL_ACTION]): string {
      return 'pencil';
    },
    getDisplayName: () =>
      i18n.translate('xpack.ml.actions.editSwimlaneTitle', {
        defaultMessage: 'Edit swim lane',
      }),
    execute: async ({ embeddable }: EditSwimlanePanelContext) => {
      if (!embeddable) {
        throw new Error('Not possible to execute an action without the embeddable context');
      }

      const [{ overlays, uiSettings, http }] = await getStartServices();
      const anomalyDetectorService = new AnomalyDetectorService(new HttpService(http));

      try {
        const result = await resolveAnomalySwimlaneUserInput(
          {
            anomalyDetectorService,
            overlays,
            uiSettings,
          },
          embeddable.getInput()
        );
        embeddable.updateInput(result);
      } catch (e) {
        return Promise.reject();
      }
    },
    isCompatible: async ({ embeddable }: EditSwimlanePanelContext) => {
      return (
        embeddable instanceof AnomalySwimlaneEmbeddable && embeddable.getInput().viewMode === 'edit'
      );
    },
  });
}
