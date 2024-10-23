/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreSetup } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { apiIsPresentationContainer } from '@kbn/presentation-containers';
import { EmbeddableApiContext } from '@kbn/presentation-publishing';
import {
  IncompatibleActionError,
  type UiActionsActionDefinition,
} from '@kbn/ui-actions-plugin/public';
import { COMMON_OBSERVABILITY_GROUPING } from '@kbn/observability-shared-plugin/common';
import { SloPublicPluginsStart, SloPublicStart } from '..';
import {
  ADD_BURN_RATE_ACTION_ID,
  SLO_BURN_RATE_EMBEDDABLE_ID,
} from '../embeddable/slo/burn_rate/constants';

export function createBurnRatePanelAction(
  getStartServices: CoreSetup<SloPublicPluginsStart, SloPublicStart>['getStartServices']
): UiActionsActionDefinition<EmbeddableApiContext> {
  return {
    id: ADD_BURN_RATE_ACTION_ID,
    grouping: COMMON_OBSERVABILITY_GROUPING,
    order: 20,
    getIconType: () => 'visGauge',
    isCompatible: async ({ embeddable }) => {
      return apiIsPresentationContainer(embeddable);
    },
    execute: async ({ embeddable }) => {
      if (!apiIsPresentationContainer(embeddable)) throw new IncompatibleActionError();
      const [coreStart, deps] = await getStartServices();
      try {
        const { openConfiguration } = await import(
          '../embeddable/slo/burn_rate/open_configuration'
        );
        const initialState = await openConfiguration(coreStart, deps);
        embeddable.addNewPanel(
          {
            panelType: SLO_BURN_RATE_EMBEDDABLE_ID,
            initialState,
          },
          true
        );
      } catch (e) {
        return Promise.reject();
      }
    },
    getDisplayName: () =>
      i18n.translate('xpack.slo.burnRateEmbeddable.ariaLabel', {
        defaultMessage: 'SLO Burn Rate',
      }),
  };
}
