/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash';

import {
  matchAllQuery,
  PivotAggsConfig,
  PivotAggsConfigDict,
  PivotGroupByConfig,
  PivotGroupByConfigDict,
  TransformPivotConfig,
  PIVOT_SUPPORTED_GROUP_BY_AGGS,
} from '../../../../../common';
import { Dictionary } from '../../../../../../../common/types/common';

import { StepDefineExposedState } from './types';
import { getAggConfigFromEsAgg, PivotSupportedAggs } from '../../../../../common/pivot_aggs';

export function applyTransformConfigToDefineState(
  state: StepDefineExposedState,
  transformConfig?: TransformPivotConfig
): StepDefineExposedState {
  // apply the transform configuration to wizard DEFINE state
  if (transformConfig !== undefined) {
    // transform aggregations config to wizard state
    state.aggList = Object.keys(transformConfig.pivot.aggregations).reduce((aggList, aggName) => {
      const aggConfig = transformConfig.pivot.aggregations[
        aggName as PivotSupportedAggs
      ] as Dictionary<any>;
      aggList[aggName] = getAggConfigFromEsAgg(aggConfig, aggName) as PivotAggsConfig;
      return aggList;
    }, {} as PivotAggsConfigDict);

    // transform group by config to wizard state
    state.groupByList = Object.keys(transformConfig.pivot.group_by).reduce(
      (groupByList, groupByName) => {
        const groupByConfig = transformConfig.pivot.group_by[groupByName] as Dictionary<any>;
        const groupBy = Object.keys(groupByConfig)[0];
        groupByList[groupByName] = {
          agg: groupBy as PIVOT_SUPPORTED_GROUP_BY_AGGS,
          aggName: groupByName,
          dropDownName: groupByName,
          ...groupByConfig[groupBy],
        } as PivotGroupByConfig;
        return groupByList;
      },
      {} as PivotGroupByConfigDict
    );

    // only apply the query from the transform config to wizard state if it's not the default query
    const query = transformConfig.source.query;
    if (query !== undefined && !isEqual(query, matchAllQuery)) {
      state.isAdvancedSourceEditorEnabled = true;
      state.searchQuery = query;
      state.sourceConfigUpdated = true;
    }

    // applying a transform config to wizard state will always result in a valid configuration
    state.valid = true;
  }

  return state;
}
