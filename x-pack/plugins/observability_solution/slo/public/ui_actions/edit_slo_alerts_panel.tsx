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
import { type UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import { SLO_ALERTS_EMBEDDABLE_ID } from '../embeddable/slo/alerts/constants';
import { SloPublicPluginsStart, SloPublicStart } from '..';
import {
  HasSloAlertsConfig,
  SloAlertsEmbeddableActionContext,
} from '../embeddable/slo/alerts/types';
export const EDIT_SLO_ALERTS_ACTION = 'editSloAlertsPanelAction';
type EditSloAlertsPanelApi = CanAccessViewMode & HasType & HasSloAlertsConfig;
const isEditSloAlertsPanelApi = (api: unknown): api is EditSloAlertsPanelApi =>
  Boolean(
    apiHasType(api) &&
      apiIsOfType(api, SLO_ALERTS_EMBEDDABLE_ID) &&
      apiCanAccessViewMode(api) &&
      getInheritedViewMode(api) === ViewMode.EDIT
  );

export function createEditSloAlertsPanelAction(
  getStartServices: CoreSetup<SloPublicPluginsStart, SloPublicStart>['getStartServices']
): UiActionsActionDefinition<SloAlertsEmbeddableActionContext> {
  return {
    id: EDIT_SLO_ALERTS_ACTION,
    type: EDIT_SLO_ALERTS_ACTION,
    getIconType(): string {
      return 'pencil';
    },
    getDisplayName: () =>
      i18n.translate('xpack.slo.actions.editSloAlertsEmbeddableTitle', {
        defaultMessage: 'Edit configuration',
      }),
    async execute({ embeddable }) {
      if (!embeddable) {
        throw new Error('Not possible to execute an action without the embeddable context');
      }

      const [coreStart, pluginStart] = await getStartServices();

      try {
        const { openSloConfiguration } = await import(
          '../embeddable/slo/alerts/slo_alerts_open_configuration'
        );

        const result = await openSloConfiguration(
          coreStart,
          pluginStart,
          embeddable.getSloAlertsConfig()
        );
        embeddable.updateSloAlertsConfig(result);
      } catch (e) {
        return Promise.reject();
      }
    },
    isCompatible: async ({ embeddable }: EmbeddableApiContext) =>
      isEditSloAlertsPanelApi(embeddable),
  };
}
