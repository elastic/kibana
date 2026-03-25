/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { COMMON_OBSERVABILITY_GROUPING } from '@kbn/observability-shared-plugin/common';
import { apiIsPresentationContainer } from '@kbn/presentation-publishing';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import {
  IncompatibleActionError,
  type UiActionsActionDefinition,
} from '@kbn/ui-actions-plugin/public';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import { ADD_APM_SERVICE_MAP_PANEL_ACTION_ID, APM_SERVICE_MAP_EMBEDDABLE } from './constants';
import type { ServiceMapEmbeddableState } from './types';

const DEFAULT_SERIALIZED_STATE: ServiceMapEmbeddableState = {
  rangeFrom: 'now-15m',
  rangeTo: 'now',
  environment: ENVIRONMENT_ALL.value,
  kuery: '',
};

export function createAddServiceMapPanelAction(): UiActionsActionDefinition<EmbeddableApiContext> {
  return {
    id: ADD_APM_SERVICE_MAP_PANEL_ACTION_ID,
    grouping: COMMON_OBSERVABILITY_GROUPING,
    order: 25,
    getIconType: () => 'apps',
    isCompatible: async ({ embeddable }) => {
      return apiIsPresentationContainer(embeddable);
    },
    execute: async ({ embeddable }) => {
      if (!apiIsPresentationContainer(embeddable)) {
        throw new IncompatibleActionError();
      }
      embeddable.addNewPanel(
        {
          panelType: APM_SERVICE_MAP_EMBEDDABLE,
          serializedState: DEFAULT_SERIALIZED_STATE,
        },
        { displaySuccessMessage: true }
      );
    },
    getDisplayName: () =>
      i18n.translate('xpack.apm.embeddable.serviceMap.addPanelTitle', {
        defaultMessage: 'Service Map (APM)',
      }),
  };
}
