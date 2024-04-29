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
// import type { SLOEmbeddable } from '../embeddable/slo/overview/slo_embeddable';
import { SLO_EMBEDDABLE } from '../embeddable/slo/constants';
import { SloPublicPluginsStart, SloPublicStart } from '..';
import {
  GroupSloCustomInput,
  HasSloOverviewConfig,
  SloOverviewEmbeddableActionContext,
} from '../embeddable/slo/overview/types';

export const EDIT_SLO_OVERVIEW_ACTION = 'editSloOverviewPanelAction';
type EditSloOverviewPanelApi = CanAccessViewMode & HasType & HasSloOverviewConfig;
const isEditSloOverviewPanelApi = (api: unknown): api is EditSloOverviewPanelApi =>
  Boolean(
    apiHasType(api) &&
      apiIsOfType(api, SLO_EMBEDDABLE) &&
      apiCanAccessViewMode(api) &&
      getInheritedViewMode(api) === ViewMode.EDIT
  );

export function createEditSloOverviewPanelAction(
  getStartServices: CoreSetup<SloPublicPluginsStart, SloPublicStart>['getStartServices']
): UiActionsActionDefinition<SloOverviewEmbeddableActionContext> {
  return {
    id: EDIT_SLO_OVERVIEW_ACTION,
    type: EDIT_SLO_OVERVIEW_ACTION,
    getIconType(): string {
      return 'pencil';
    },
    getDisplayName: () =>
      i18n.translate('xpack.slo.actions.editSloOverviewEmbeddableTitle', {
        defaultMessage: 'Edit criteria',
      }),
    async execute(context) {
      const { embeddable } = context;
      if (!embeddable) {
        throw new Error('Not possible to execute an action without the embeddable context');
      }

      const [coreStart, pluginStart] = await getStartServices();

      try {
        const { openSloConfiguration } = await import(
          '../embeddable/slo/overview/slo_overview_open_configuration'
        );

        const result = await openSloConfiguration(
          coreStart,
          pluginStart,
          embeddable.getSloOverviewConfig()
        );
        embeddable.updateSloOverviewConfig(result as GroupSloCustomInput);
      } catch (e) {
        return Promise.reject();
      }
    },
    isCompatible: async ({ embeddable }: EmbeddableApiContext) => {
      return (
        isEditSloOverviewPanelApi(embeddable) &&
        embeddable.getSloOverviewConfig().overviewMode === 'groups'
      );
    },
  };
}
