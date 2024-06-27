/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { PresentationContainer } from '@kbn/presentation-containers';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { ML_APP_NAME, PLUGIN_ICON, PLUGIN_ID } from '../../common/constants/app';
import { ANOMALY_SWIMLANE_EMBEDDABLE_TYPE } from '../embeddables';
import type { AnomalySwimLaneEmbeddableApi } from '../embeddables/anomaly_swimlane/types';
import type { MlCoreSetup } from '../plugin';

export const EDIT_SWIMLANE_PANEL_ACTION = 'editSwimlanePanelAction';

export type CreateSwimlanePanelActionContext = EmbeddableApiContext & {
  embeddable: AnomalySwimLaneEmbeddableApi;
};

const parentApiIsCompatible = async (
  parentApi: unknown
): Promise<PresentationContainer | undefined> => {
  const { apiIsPresentationContainer } = await import('@kbn/presentation-containers');
  // we cannot have an async type check, so return the casted parentApi rather than a boolean
  return apiIsPresentationContainer(parentApi) ? (parentApi as PresentationContainer) : undefined;
};

export function createAddSwimlanePanelAction(
  getStartServices: MlCoreSetup['getStartServices']
): UiActionsActionDefinition<CreateSwimlanePanelActionContext> {
  return {
    id: 'create-anomaly-swimlane',
    grouping: [
      {
        id: PLUGIN_ID,
        getDisplayName: () => ML_APP_NAME,
        getIconType: () => PLUGIN_ICON,
      },
    ],
    order: 40,
    // @ts-expect-error getIconType is typed as string, but EuiIcon accepts ReactComponent for custom icons.
    // See https://github.com/elastic/kibana/issues/184643
    getIconType: () => (iconProps) =>
      (
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          xmlns="http://www.w3.org/2000/svg"
          {...iconProps}
        >
          <path
            d="M1 5V1H5V5H1ZM4 4V2H2V4H4ZM6 5V1H10V5H6ZM9 4V2H7V4H9ZM11 5V1H15V5H11ZM12 4H14V2H12V4ZM1 10V6H5V10H1ZM4 9V7H2V9H4ZM6 10V6H10V10H6ZM9 9V7H7V9H9ZM11 10V6H15V10H11ZM14 9V7H12V9H14ZM1 15V11H5V15H1ZM2 14H4V12H2V14ZM6 15V11H10V15H6ZM7 14H9V12H7V14ZM11 15V11H15V15H11ZM12 14H14V12H12V14Z"
            fill="currentColor"
          />
          <rect width="4" height="4" transform="translate(6 1)" fill="currentColor" />
          <rect width="4" height="4" transform="translate(11 6)" fill="currentColor" />
          <rect width="4" height="4" transform="translate(6 6)" fill="currentColor" />
          <rect width="4" height="4" transform="translate(1 11)" fill="currentColor" />
        </svg>
      ),
    getDisplayName: () =>
      i18n.translate('xpack.ml.components.jobAnomalyScoreEmbeddable.displayName', {
        defaultMessage: 'Anomaly swim lane',
      }),
    getDisplayNameTooltip: () =>
      i18n.translate('xpack.ml.components.jobAnomalyScoreEmbeddable.description', {
        defaultMessage: 'View anomaly detection results in a timeline.',
      }),
    async isCompatible(context: EmbeddableApiContext) {
      return Boolean(await parentApiIsCompatible(context.embeddable));
    },
    async execute(context) {
      const presentationContainerParent = await parentApiIsCompatible(context.embeddable);
      if (!presentationContainerParent) throw new IncompatibleActionError();

      const [coreStart, pluginStart] = await getStartServices();

      try {
        const { resolveAnomalySwimlaneUserInput } = await import(
          '../embeddables/anomaly_swimlane/anomaly_swimlane_setup_flyout'
        );

        const initialState = await resolveAnomalySwimlaneUserInput(
          {
            ...coreStart,
            ...pluginStart,
          },
          context.embeddable,
          context.embeddable.uuid
        );

        presentationContainerParent.addNewPanel({
          panelType: ANOMALY_SWIMLANE_EMBEDDABLE_TYPE,
          initialState: {
            ...initialState,
            title: initialState.panelTitle,
          },
        });
      } catch (e) {
        return Promise.reject();
      }
    },
  };
}
