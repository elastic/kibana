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
import { SYNTHETICS_OVERVIEW_EMBEDDABLE } from '../constants';

export const COMMON_SYNTHETICS_GROUPING = [
  {
    id: 'synthetics',
    getDisplayName: () =>
      i18n.translate('xpack.synthetics.common.constants.grouping.legacy', {
        defaultMessage: 'Synthetics',
      }),
    getIconType: () => {
      return 'online';
    },
  },
];
export const ADD_SYNTHETICS_OVERVIEW_ACTION_ID = 'CREATE_SYNTHETICS_OVERVIEW_EMBEDDABLE';

export function createStatusOverviewPanelAction(): UiActionsActionDefinition<EmbeddableApiContext> {
  return {
    id: ADD_SYNTHETICS_OVERVIEW_ACTION_ID,
    grouping: COMMON_SYNTHETICS_GROUPING,
    order: 30,
    getIconType: () => 'online',
    isCompatible: async ({ embeddable }) => {
      return apiIsPresentationContainer(embeddable);
    },
    execute: async ({ embeddable }) => {
      if (!apiIsPresentationContainer(embeddable)) throw new IncompatibleActionError();
      try {
        embeddable.addNewPanel({
          panelType: SYNTHETICS_OVERVIEW_EMBEDDABLE,
        });
      } catch (e) {
        return Promise.reject();
      }
    },
    getDisplayName: () =>
      i18n.translate('xpack.synthetics.syntheticsEmbeddable.ariaLabel', {
        defaultMessage: 'Synthetics Overview',
      }),
  };
}
