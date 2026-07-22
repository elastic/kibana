/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { COMMON_OBSERVABILITY_GROUPING } from '@kbn/observability-shared-plugin/common';
import { apiIsPresentationContainer, apiPublishesTimeRange } from '@kbn/presentation-publishing';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { openLazyFlyout } from '@kbn/presentation-util';
import {
  IncompatibleActionError,
  type UiActionsActionDefinition,
} from '@kbn/ui-actions-plugin/public';
import { firstValueFrom } from 'rxjs';
import type { ServiceMapEmbeddableState } from '../../../common/embeddable/service_map_embeddable_schema';
import { isActivePlatinumLicense } from '../../../common/license_check';
import { ADD_APM_SERVICE_MAP_PANEL_ACTION_ID, APM_SERVICE_MAP_EMBEDDABLE } from './constants';
import { ServiceMapEditorFlyout } from './service_map_editor_flyout';
import type { EmbeddableDeps } from '../types';
import { ApmEmbeddableContext } from '../embeddable_context';

async function hasServiceMapLicense(deps: EmbeddableDeps) {
  const license = await firstValueFrom(deps.pluginsStart.licensing.license$);
  return isActivePlatinumLicense(license);
}

export function createAddServiceMapPanelAction(
  deps: EmbeddableDeps
): UiActionsActionDefinition<EmbeddableApiContext> {
  return {
    id: ADD_APM_SERVICE_MAP_PANEL_ACTION_ID,
    grouping: COMMON_OBSERVABILITY_GROUPING,
    order: 25,
    getIconType: () => 'apps',
    isCompatible: async ({ embeddable }) => {
      return Boolean(
        deps.config.serviceMapEnabled &&
          (await hasServiceMapLicense(deps)) &&
          apiIsPresentationContainer(embeddable)
      );
    },
    execute: async ({ embeddable }) => {
      if (
        !deps.config.serviceMapEnabled ||
        !(await hasServiceMapLicense(deps)) ||
        !apiIsPresentationContainer(embeddable)
      ) {
        throw new IncompatibleActionError();
      }

      const timeRange = apiPublishesTimeRange(embeddable)
        ? embeddable.timeRange$.getValue()
        : undefined;

      openLazyFlyout({
        core: deps.coreStart,
        parentApi: embeddable,
        flyoutProps: {
          size: 'm',
        },
        loadContent: async ({ closeFlyout, ariaLabelledBy }) => {
          return (
            <ApmEmbeddableContext deps={deps}>
              <ServiceMapEditorFlyout
                ariaLabelledBy={ariaLabelledBy}
                deps={deps}
                timeRange={timeRange}
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
            </ApmEmbeddableContext>
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
