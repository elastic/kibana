/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { CoreSetup } from '@kbn/core/public';
import { apiIsPresentationContainer } from '@kbn/presentation-containers';
import {
  IncompatibleActionError,
  type UiActionsActionDefinition,
} from '@kbn/ui-actions-plugin/public';
import { EmbeddableApiContext } from '@kbn/presentation-publishing';
import {
  ADD_SLO_ERROR_BUDGET_ACTION_ID,
  SLO_ERROR_BUDGET_ID,
} from '../embeddable/slo/error_budget/constants';
import { SloPublicPluginsStart, SloPublicStart } from '..';
import { COMMON_SLO_GROUPING } from '../embeddable/slo/common/constants';
export function createAddErrorBudgetPanelAction(
  getStartServices: CoreSetup<SloPublicPluginsStart, SloPublicStart>['getStartServices']
): UiActionsActionDefinition<EmbeddableApiContext> {
  return {
    id: ADD_SLO_ERROR_BUDGET_ACTION_ID,
    grouping: COMMON_SLO_GROUPING,
    getIconType: () => 'visLine',
    isCompatible: async ({ embeddable }) => {
      return apiIsPresentationContainer(embeddable);
    },
    execute: async ({ embeddable }) => {
      if (!apiIsPresentationContainer(embeddable)) throw new IncompatibleActionError();
      const [coreStart, deps] = await getStartServices();
      try {
        const { openSloConfiguration } = await import(
          '../embeddable/slo/error_budget/error_budget_open_configuration'
        );
        const initialState = await openSloConfiguration(coreStart, deps);
        embeddable.addNewPanel(
          {
            panelType: SLO_ERROR_BUDGET_ID,
            initialState,
          },
          true
        );
      } catch (e) {
        return Promise.reject();
      }
    },
    getDisplayName: () =>
      i18n.translate('xpack.slo.errorBudgetEmbeddable.ariaLabel', {
        defaultMessage: 'SLO Error Budget',
      }),
  };
}
