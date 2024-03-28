/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DASHBOARD_APP_ID } from '@kbn/dashboard-plugin/public';
import type { Filter } from '@kbn/es-query';
import { FilterStateStore } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { UiActionsActionDefinition } from '@kbn/ui-actions-plugin/public';
import { firstValueFrom } from 'rxjs';
import { isAnomalySwimlaneSelectionTriggerContext } from './triggers';
import { SWIMLANE_TYPE, VIEW_BY_JOB_LABEL } from '../application/explorer/explorer_constants';
import type { SwimLaneDrilldownContext } from '../embeddables';
import type { MlCoreSetup } from '../plugin';
import { CONTROLLED_BY_SWIM_LANE_FILTER } from './constants';

export const APPLY_INFLUENCER_FILTERS_ACTION = 'applyInfluencerFiltersAction';

const supportedApps = [DASHBOARD_APP_ID];

export function createApplyInfluencerFiltersAction(
  getStartServices: MlCoreSetup['getStartServices']
): UiActionsActionDefinition<SwimLaneDrilldownContext> {
  return {
    id: 'apply-to-current-view',
    type: APPLY_INFLUENCER_FILTERS_ACTION,
    getIconType(): string {
      return 'filter';
    },
    getDisplayName() {
      return i18n.translate('xpack.ml.actions.applyInfluencersFiltersTitle', {
        defaultMessage: 'Filter for value',
      });
    },
    async execute({ data }) {
      if (!data) {
        throw new Error('No swim lane selection data provided');
      }
      const [, pluginStart] = await getStartServices();
      const filterManager = pluginStart.data.query.filterManager;

      filterManager.addFilters(
        data.lanes.map<Filter>((influencerValue) => {
          return {
            $state: {
              store: FilterStateStore.APP_STATE,
            },
            meta: {
              alias: i18n.translate('xpack.ml.actions.influencerFilterAliasLabel', {
                defaultMessage: '{labelValue}',
                values: {
                  labelValue: `${data.viewByFieldName}:${influencerValue}`,
                },
              }),
              controlledBy: CONTROLLED_BY_SWIM_LANE_FILTER,
              disabled: false,
              key: data.viewByFieldName,
              negate: false,
              params: {
                query: influencerValue,
              },
              type: 'phrase',
            },
            query: {
              match_phrase: {
                [data.viewByFieldName!]: influencerValue,
              },
            },
          };
        })
      );
    },
    async isCompatible(context: EmbeddableApiContext) {
      const [{ application }] = await getStartServices();
      const appId = await firstValueFrom(application.currentAppId$);

      // Only compatible with view by influencer swim lanes and single selection
      return (
        supportedApps.includes(appId!) &&
        isAnomalySwimlaneSelectionTriggerContext(context) &&
        context.data !== undefined &&
        context.data.type === SWIMLANE_TYPE.VIEW_BY &&
        context.data.viewByFieldName !== VIEW_BY_JOB_LABEL &&
        context.data.lanes.length === 1
      );
    },
  };
}
