/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import { i18n } from '@kbn/i18n';
import { ViewMode } from '@kbn/embeddable-plugin/common';
import type { CoreSetup } from '@kbn/core/public';
import { IEmbeddable, EmbeddableOutput } from '@kbn/embeddable-plugin/public';
import { SLO_ALERTS_EMBEDDABLE } from '../embeddable/slo/constants';
import { ObservabilityPublicPluginsStart, ObservabilityPublicStart } from '..';
import { SloAlertsEmbeddableInput } from '../embeddable/slo/alerts/types';

export const EDIT_SLO_ALERTS_ACTION = 'editSloAlertsPanelAction';
export interface EditSloAlertsPanelContext {
  embeddable: IEmbeddable<SloAlertsEmbeddableInput, EmbeddableOutput>;
}
export function createEditSloAlertsPanelAction(
  getStartServices: CoreSetup<
    ObservabilityPublicPluginsStart,
    ObservabilityPublicStart
  >['getStartServices']
): UiActionsActionDefinition<EditSloAlertsPanelContext> {
  return {
    id: EDIT_SLO_ALERTS_ACTION,
    type: EDIT_SLO_ALERTS_ACTION,
    getIconType(context): string {
      return 'pencil';
    },
    getDisplayName: () =>
      i18n.translate('xpack.observability.actions.editSloAlertsEmbeddableTitle', {
        defaultMessage: 'Edit configuration',
      }),
    async execute({ embeddable }) {
      if (!embeddable) {
        throw new Error('Not possible to execute an action without the embeddable context');
      }

      const [coreStart, pluginStart] = await getStartServices();

      try {
        const { resolveEmbeddableSloUserInput } = await import(
          '../embeddable/slo/alerts/handle_explicit_input'
        );

        const result = await resolveEmbeddableSloUserInput(
          coreStart,
          pluginStart,
          embeddable.getInput()
        );
        embeddable.updateInput(result);
      } catch (e) {
        return Promise.reject();
      }
    },
    async isCompatible({ embeddable }) {
      return (
        embeddable.type === SLO_ALERTS_EMBEDDABLE &&
        embeddable.getInput().viewMode === ViewMode.EDIT
      );
    },
  };
}
