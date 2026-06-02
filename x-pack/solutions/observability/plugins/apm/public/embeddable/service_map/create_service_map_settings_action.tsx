/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { apiIsOfType } from '@kbn/presentation-publishing';
import { openLazyFlyout } from '@kbn/presentation-util';
import {
  IncompatibleActionError,
  type UiActionsActionDefinition,
} from '@kbn/ui-actions-plugin/public';
import { APM_SERVICE_MAP_EMBEDDABLE, APM_SERVICE_MAP_SETTINGS_ACTION_ID } from './constants';
import { apiHasApplyCustomFilters } from './service_map_embeddable_factory';
import { ServiceMapFilterSettingsFlyout } from './service_map_filter_settings_flyout';
import type { EmbeddableDeps } from '../types';
import { ApmEmbeddableContext } from '../embeddable_context';

/**
 * Panel context-menu action ("Service map filter settings") that opens a small flyout to
 * toggle whether the panel applies its own filters or follows the dashboard's filters.
 * Lives next to the built-in "Settings" / "Edit configuration" actions on the panel ⋮ menu.
 */
export function createServiceMapSettingsAction(
  deps: EmbeddableDeps
): UiActionsActionDefinition<EmbeddableApiContext> {
  return {
    id: APM_SERVICE_MAP_SETTINGS_ACTION_ID,
    // Sit just below the built-in "Settings" action (≈45) and "Edit" (≈50) so it groups
    // with the other panel-configuration entries.
    order: 40,
    getIconType: () => 'filter',
    isCompatible: async ({ embeddable }) => {
      return (
        deps.config.serviceMapEnabled &&
        apiIsOfType(embeddable, APM_SERVICE_MAP_EMBEDDABLE) &&
        apiHasApplyCustomFilters(embeddable)
      );
    },
    execute: async ({ embeddable }) => {
      if (
        !deps.config.serviceMapEnabled ||
        !apiIsOfType(embeddable, APM_SERVICE_MAP_EMBEDDABLE) ||
        !apiHasApplyCustomFilters(embeddable)
      ) {
        throw new IncompatibleActionError();
      }

      openLazyFlyout({
        core: deps.coreStart,
        parentApi: embeddable,
        flyoutProps: {
          size: 's',
          'data-test-subj': 'apmServiceMapFilterSettingsFlyout',
        },
        loadContent: async ({ closeFlyout, ariaLabelledBy }) => {
          return (
            <ApmEmbeddableContext deps={deps}>
              <ServiceMapFilterSettingsFlyout
                ariaLabelledBy={ariaLabelledBy}
                initialApplyCustomFilters={embeddable.applyCustomFilters$.getValue() ?? true}
                onCancel={closeFlyout}
                onSave={(applyCustomFilters) => {
                  embeddable.setApplyCustomFilters(applyCustomFilters);
                  closeFlyout();
                }}
              />
            </ApmEmbeddableContext>
          );
        },
      });
    },
    getDisplayName: () =>
      i18n.translate('xpack.apm.embeddable.serviceMap.settingsActionTitle', {
        defaultMessage: 'Service map filter settings',
      }),
  };
}
