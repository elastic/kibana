/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ActionContextMapping, createAction } from '../../../../../src/plugins/ui_actions/public';
import {
  AnomalySwimlaneEmbeddable,
  SwimLaneDrilldownContext,
} from '../embeddables/anomaly_swimlane/anomaly_swimlane_embeddable';
import { MlCoreSetup } from '../plugin';
import { SWIMLANE_TYPE, VIEW_BY_JOB_LABEL } from '../application/explorer/explorer_constants';
import { Filter, FilterStateStore } from '../../../../../src/plugins/data/common';

export const APPLY_INFLUENCER_FILTERS_ACTION = 'applyInfluencerFiltersAction';

export const CONTROLLED_BY_SWIM_LANE_FILTER = 'anomaly-swim-lane';

export function createApplyInfluencerFiltersAction(
  getStartServices: MlCoreSetup['getStartServices']
) {
  return createAction<typeof APPLY_INFLUENCER_FILTERS_ACTION>({
    id: 'apply-to-current-view',
    type: APPLY_INFLUENCER_FILTERS_ACTION,
    getIconType(context: ActionContextMapping[typeof APPLY_INFLUENCER_FILTERS_ACTION]): string {
      return 'filter';
    },
    getDisplayName() {
      return i18n.translate('xpack.ml.actions.applyInfluencersFiltersTitle', {
        defaultMessage: 'Filer for value',
      });
    },
    async execute({ data }: SwimLaneDrilldownContext) {
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
                defaultMessage: 'Influencer {labelValue}',
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
    async isCompatible({ embeddable, data }: SwimLaneDrilldownContext) {
      // Only compatible with view by influencer swim lanes and single selection
      return (
        embeddable instanceof AnomalySwimlaneEmbeddable &&
        data !== undefined &&
        data.type === SWIMLANE_TYPE.VIEW_BY &&
        data.viewByFieldName !== VIEW_BY_JOB_LABEL &&
        data.lanes.length === 1
      );
    },
  });
}
