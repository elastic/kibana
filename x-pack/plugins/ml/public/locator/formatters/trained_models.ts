/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/public';
import type {
  TrainedModelsNodesUrlState,
  TrainedModelsUrlState,
} from '../../../common/types/locator';
import { ML_PAGES } from '../../../common/constants/locator';
import type { AppPageState, ListingPageUrlState } from '../../../common/types/common';

export function formatTrainedModelsManagementUrl(
  appBasePath: string,
  mlUrlGeneratorState: TrainedModelsUrlState['pageState']
): string {
  let url = `${appBasePath}/${ML_PAGES.TRAINED_MODELS_MANAGE}`;
  if (mlUrlGeneratorState) {
    const { modelId } = mlUrlGeneratorState;

    if (modelId) {
      const modelsListState: Partial<ListingPageUrlState> = {
        queryText: `model_id:(${modelId})`,
      };

      const queryState: AppPageState<ListingPageUrlState> = {
        [ML_PAGES.TRAINED_MODELS_MANAGE]: modelsListState,
      };

      url = setStateToKbnUrl<AppPageState<ListingPageUrlState>>(
        '_a',
        queryState,
        { useHash: false, storeInHashQuery: false },
        url
      );
    }
  }
  return url;
}

export function formatTrainedModelsNodesManagementUrl(
  appBasePath: string,
  mlUrlGeneratorState: TrainedModelsNodesUrlState['pageState']
): string {
  let url = `${appBasePath}/${ML_PAGES.TRAINED_MODELS_NODES}`;
  if (mlUrlGeneratorState) {
    const { nodeId } = mlUrlGeneratorState;
    if (nodeId) {
      const nodesListState: Partial<ListingPageUrlState> = {
        queryText: `name:(${nodeId})`,
      };

      const queryState: AppPageState<ListingPageUrlState> = {
        [ML_PAGES.TRAINED_MODELS_NODES]: nodesListState,
      };

      url = setStateToKbnUrl<AppPageState<ListingPageUrlState>>(
        '_a',
        queryState,
        { useHash: false, storeInHashQuery: false },
        url
      );
    }
  }

  return url;
}
