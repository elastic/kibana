/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/public';
import { ViewMode } from '@kbn/embeddable-plugin/common';
import { i18n } from '@kbn/i18n';
import {
  CanAccessViewMode,
  EmbeddableApiContext,
  HasType,
  apiCanAccessViewMode,
  apiHasType,
  apiIsOfType,
  getInheritedViewMode,
} from '@kbn/presentation-publishing';
import {
  IncompatibleActionError,
  type UiActionsActionDefinition,
} from '@kbn/ui-actions-plugin/public';
import { SloPublicPluginsStart, SloPublicStart } from '..';
import { SLO_EMBEDDABLE } from '../embeddable/slo/constants';
import {
  GroupSloCustomInput,
  HasSloGroupOverviewConfig,
  SloOverviewEmbeddableActionContext,
  apiHasSloGroupOverviewConfig,
} from '../embeddable/slo/overview/types';

export const EDIT_SLO_OVERVIEW_ACTION = 'editSloOverviewPanelAction';
type EditSloOverviewPanelApi = CanAccessViewMode & HasType & HasSloGroupOverviewConfig;
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
      if (!apiHasSloGroupOverviewConfig(embeddable)) {
        throw new IncompatibleActionError();
      }

      const [coreStart, pluginStart] = await getStartServices();

      try {
        const { openSloConfiguration } = await import(
          '../embeddable/slo/overview/slo_overview_open_configuration'
        );

        const result = await openSloConfiguration(
          coreStart,
          pluginStart,
          embeddable.getSloGroupOverviewConfig()
        );
        embeddable.updateSloGroupOverviewConfig(result as GroupSloCustomInput);
      } catch (e) {
        return Promise.reject();
      }
    },
    isCompatible: async ({ embeddable }: EmbeddableApiContext) => {
      return (
        isEditSloOverviewPanelApi(embeddable) &&
        embeddable.getSloGroupOverviewConfig().overviewMode === 'groups'
      );
    },
  };
}
