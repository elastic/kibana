/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { createAction } from '@kbn/ui-actions-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { MlCoreSetup } from '../plugin';
import { ANOMALY_SWIMLANE_EMBEDDABLE_TYPE, EditSwimlanePanelContext } from '../embeddables';

export const EDIT_SWIMLANE_PANEL_ACTION = 'editSwimlanePanelAction';

export function createEditSwimlanePanelAction(getStartServices: MlCoreSetup['getStartServices']) {
  return createAction<EditSwimlanePanelContext>({
    id: 'edit-anomaly-swimlane',
    type: EDIT_SWIMLANE_PANEL_ACTION,
    getIconType(context): string {
      return 'pencil';
    },
    getDisplayName: () =>
      i18n.translate('xpack.ml.actions.editSwimlaneTitle', {
        defaultMessage: 'Edit swim lane',
      }),
    async execute({ embeddable }) {
      if (!embeddable) {
        throw new Error('Not possible to execute an action without the embeddable context');
      }

      const [coreStart] = await getStartServices();

      try {
        const { resolveAnomalySwimlaneUserInput } = await import(
          '../embeddables/anomaly_swimlane/anomaly_swimlane_setup_flyout'
        );

        const result = await resolveAnomalySwimlaneUserInput(coreStart, embeddable.getInput());
        embeddable.updateInput(result);
      } catch (e) {
        return Promise.reject();
      }
    },
    async isCompatible({ embeddable }) {
      return (
        embeddable.type === ANOMALY_SWIMLANE_EMBEDDABLE_TYPE &&
        embeddable.getInput().viewMode === ViewMode.EDIT
      );
    },
  });
}
