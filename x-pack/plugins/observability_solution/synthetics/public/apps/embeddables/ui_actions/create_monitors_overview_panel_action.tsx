/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { apiIsPresentationContainer } from '@kbn/presentation-containers';
import {
  IncompatibleActionError,
  type UiActionsActionDefinition,
} from '@kbn/ui-actions-plugin/public';
import { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { StartServicesAccessor } from '@kbn/core-lifecycle-browser';
import { COMMON_OBSERVABILITY_GROUPING } from '@kbn/observability-shared-plugin/common';
import { ClientPluginsStart } from '../../../plugin';
import { SYNTHETICS_MONITORS_EMBEDDABLE } from '../constants';

export const ADD_SYNTHETICS_MONITORS_OVERVIEW_ACTION_ID =
  'CREATE_SYNTHETICS_MONITORS_OVERVIEW_EMBEDDABLE';

export function createMonitorsOverviewPanelAction(
  getStartServices: StartServicesAccessor<ClientPluginsStart>
): UiActionsActionDefinition<EmbeddableApiContext> {
  return {
    id: ADD_SYNTHETICS_MONITORS_OVERVIEW_ACTION_ID,
    grouping: COMMON_OBSERVABILITY_GROUPING,
    order: 5,
    getIconType: () => 'play',
    isCompatible: async ({ embeddable }) => {
      return apiIsPresentationContainer(embeddable);
    },
    execute: async ({ embeddable }) => {
      if (!apiIsPresentationContainer(embeddable)) throw new IncompatibleActionError();
      const [coreStart, pluginStart] = await getStartServices();
      const { openMonitorConfiguration } = await import('../common/monitors_open_configuration');

      const initialState = await openMonitorConfiguration({
        coreStart,
        pluginStart,
        title: i18n.translate(
          'xpack.synthetics.editSyntheticsOverviewEmbeddableTitle.overview.title',
          {
            defaultMessage: 'Create monitors overview',
          }
        ),
      });
      try {
        embeddable.addNewPanel({
          panelType: SYNTHETICS_MONITORS_EMBEDDABLE,
          initialState,
        });
      } catch (e) {
        return Promise.reject();
      }
    },
    getDisplayName: () =>
      i18n.translate('xpack.synthetics.syntheticsEmbeddable.monitors.ariaLabel', {
        defaultMessage: 'Monitors overview',
      }),
  };
}
