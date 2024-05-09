/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ViewMode } from '@kbn/embeddable-plugin/common';
import type { CoreSetup } from '@kbn/core/public';
import {
  apiCanAccessViewMode,
  apiHasType,
  apiIsOfType,
  EmbeddableApiContext,
  getInheritedViewMode,
  CanAccessViewMode,
  HasType,
} from '@kbn/presentation-publishing';
import { createAction } from '@kbn/ui-actions-plugin/public';
import type { SLOAlertsEmbeddable } from '../embeddable/slo/alerts/slo_alerts_embeddable';
import { SLO_ALERTS_EMBEDDABLE } from '../embeddable/slo/constants';
import { SloPublicPluginsStart, SloPublicStart } from '..';
import { HasSloAlertsConfig } from '../embeddable/slo/alerts/types';

export const EDIT_SLO_ALERTS_ACTION = 'editSloAlertsPanelAction';
type EditSloAlertsPanelApi = CanAccessViewMode & HasType & HasSloAlertsConfig;
const isEditSloAlertsPanelApi = (api: unknown): api is EditSloAlertsPanelApi =>
  Boolean(
    apiHasType(api) &&
      apiIsOfType(api, SLO_ALERTS_EMBEDDABLE) &&
      apiCanAccessViewMode(api) &&
      getInheritedViewMode(api) === ViewMode.EDIT
  );

export function createEditSloAlertsPanelAction(
  getStartServices: CoreSetup<SloPublicPluginsStart, SloPublicStart>['getStartServices']
) {
  return createAction<EmbeddableApiContext>({
    id: EDIT_SLO_ALERTS_ACTION,
    type: EDIT_SLO_ALERTS_ACTION,
    getIconType(): string {
      return 'pencil';
    },
    getDisplayName: () =>
      i18n.translate('xpack.slo.actions.editSloAlertsEmbeddableTitle', {
        defaultMessage: 'Edit configuration',
      }),
    async execute({ embeddable }: EmbeddableApiContext) {
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
          (embeddable as SLOAlertsEmbeddable).getSloAlertsConfig()
        );
        (embeddable as SLOAlertsEmbeddable).updateInput(result);
      } catch (e) {
        return Promise.reject();
      }
    },
    isCompatible: async ({ embeddable }: EmbeddableApiContext) =>
      isEditSloAlertsPanelApi(embeddable),
  });
}
