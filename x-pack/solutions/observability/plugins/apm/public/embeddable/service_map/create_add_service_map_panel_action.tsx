/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import { COMMON_OBSERVABILITY_GROUPING } from '@kbn/observability-shared-plugin/common';
import { apiIsPresentationContainer } from '@kbn/presentation-publishing';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { openLazyFlyout } from '@kbn/presentation-util';
import {
  IncompatibleActionError,
  type UiActionsActionDefinition,
} from '@kbn/ui-actions-plugin/public';
import { ADD_APM_SERVICE_MAP_PANEL_ACTION_ID, APM_SERVICE_MAP_EMBEDDABLE } from './constants';
import type { ServiceMapEmbeddableState } from './types';
import { ServiceMapEditorFlyout } from './service_map_editor_flyout';

export function createAddServiceMapPanelAction(
  coreStart: CoreStart
): UiActionsActionDefinition<EmbeddableApiContext> {
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

      openLazyFlyout({
        core: coreStart,
        parentApi: embeddable,
        loadContent: async ({ closeFlyout, ariaLabelledBy }) => {
          return (
            <ServiceMapEditorFlyout
              ariaLabelledBy={ariaLabelledBy}
              onCancel={closeFlyout}
              onSave={(state: ServiceMapEmbeddableState) => {
                embeddable.addNewPanel(
                  {
                    panelType: APM_SERVICE_MAP_EMBEDDABLE,
                    serializedState: state,
                  },
                  { displaySuccessMessage: true }
                );
                closeFlyout();
              }}
            />
          );
        },
      });
    },
    getDisplayName: () =>
      i18n.translate('xpack.apm.embeddable.serviceMap.addPanelTitle', {
        defaultMessage: 'Service map',
      }),
  };
}
