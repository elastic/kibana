/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import {
  IncompatibleActionError,
  type UiActionsActionDefinition,
} from '@kbn/ui-actions-plugin/public';
import { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { StartServicesAccessor } from '@kbn/core-lifecycle-browser';
import { COMMON_OBSERVABILITY_GROUPING } from '@kbn/observability-shared-plugin/common';
import { ClientPluginsStart } from '../../../plugin';
import { SYNTHETICS_STATS_OVERVIEW_EMBEDDABLE } from '../constants';

export const ADD_SYNTHETICS_OVERVIEW_ACTION_ID = 'CREATE_SYNTHETICS_STATS_OVERVIEW_EMBEDDABLE';

export function createStatusOverviewPanelAction(
  getStartServices: StartServicesAccessor<ClientPluginsStart>
): UiActionsActionDefinition<EmbeddableApiContext> {
  return {
    id: ADD_SYNTHETICS_OVERVIEW_ACTION_ID,
    grouping: COMMON_OBSERVABILITY_GROUPING,
    order: 5,
    getIconType: () => 'online',
    isCompatible: async ({ embeddable }) => {
      const { compatibilityCheck } = await import('./compatibility_check');
      return compatibilityCheck(embeddable);
    },
    execute: async ({ embeddable }) => {
      const { compatibilityCheck } = await import('./compatibility_check');
      if (!compatibilityCheck(embeddable)) throw new IncompatibleActionError();
      try {
        const { openMonitorConfiguration } = await import('../common/monitors_open_configuration');
        const [coreStart, pluginStart] = await getStartServices();

        const initialState = await openMonitorConfiguration({
          coreStart,
          pluginStart,
        });
        embeddable.addNewPanel({
          panelType: SYNTHETICS_STATS_OVERVIEW_EMBEDDABLE,
          initialState,
        });
      } catch (e) {
        return Promise.reject();
      }
    },
    getDisplayName: () =>
      i18n.translate('xpack.synthetics.syntheticsEmbeddable.stats.ariaLabel', {
        defaultMessage: 'Monitors stats',
      }),
  };
}
