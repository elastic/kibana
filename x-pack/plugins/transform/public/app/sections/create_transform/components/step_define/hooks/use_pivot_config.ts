/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { Action } from 'redux';
import type { ThunkAction } from 'redux-thunk';

import { i18n } from '@kbn/i18n';
import type { NotificationsStart } from '@kbn/core/public';
import { KBN_FIELD_TYPES } from '@kbn/field-types';
import { isDefined } from '@kbn/ml-is-defined';

import { AggName } from '../../../../../../../common/types/aggregations';
import { dictionaryToArray } from '../../../../../../../common/types/common';

import {
  DropDownLabel,
  isPivotGroupByConfigWithUiSupport,
  PivotAggsConfig,
  PivotAggsConfigDict,
  PivotGroupByConfig,
} from '../../../../../common';

import {
  useWizardSelector,
  type StoreState,
} from '../../../state_management/create_transform_store';
import { stepDefineSlice } from '../../../state_management/step_define_slice';
import { getAggNameConflictToastMessages, getPivotDropdownOptions } from '../common';
import { useWizardContext } from '../../wizard/wizard';
import {
  isPivotAggConfigTopMetric,
  isPivotAggsWithExtendedForm,
} from '../../../../../common/pivot_aggs';
import { TransformPivotConfig } from '../../../../../../../common/types/transform';
import { PIVOT_SUPPORTED_AGGS } from '../../../../../../../common/types/pivot_aggs';
import { isPivotAggConfigWithUiSupport } from '../../../../../common/pivot_group_by';

/**
 * Clones aggregation configuration and updates parent references
 * for the sub-aggregations.
 */
function cloneAggItem(item: PivotAggsConfig, parentRef?: PivotAggsConfig) {
  const newItem = { ...item };
  if (parentRef !== undefined) {
    newItem.parentAgg = parentRef;
  }
  if (newItem.subAggs !== undefined) {
    const newSubAggs: PivotAggsConfigDict = {};
    for (const [key, subItem] of Object.entries(newItem.subAggs)) {
      newSubAggs[key] = cloneAggItem(subItem, newItem);
    }
    newItem.subAggs = newSubAggs;
  }
  return newItem;
}

/**
 * Checks if the aggregations collection is invalid.
 */
function isConfigInvalid(aggsArray: PivotAggsConfig[]): boolean {
  return aggsArray.some((agg) => {
    return (
      (isPivotAggsWithExtendedForm(agg) && !agg.isValid()) ||
      (agg.subAggs && isConfigInvalid(Object.values(agg.subAggs)))
    );
  });
}

export function validatePivotConfig(config: TransformPivotConfig['pivot']) {
  const valid =
    Object.values(config.aggregations).length > 0 && Object.values(config.group_by).length > 0;
  const isValid: boolean = valid && !isConfigInvalid(dictionaryToArray(config.aggregations));
  return {
    isValid,
    ...(isValid
      ? {}
      : {
          errorMessage: i18n.translate(
            'xpack.transform.pivotPreview.PivotPreviewIncompleteConfigCalloutBody',
            {
              defaultMessage: 'Please choose at least one group-by field and aggregation.',
            }
          ),
        }),
  };
}

/**
 * Returns a root aggregation configuration
 * for provided aggregation item.
 */
function getRootAggregation(item: PivotAggsConfig) {
  let rootItem = item;
  while (rootItem.parentAgg !== undefined) {
    rootItem = rootItem.parentAgg;
  }
  return rootItem;
}

export const usePivotConfigOptions = () => {
  const runtimeMappings = useWizardSelector((s) => s.advancedRuntimeMappingsEditor.runtimeMappings);
  const { searchItems } = useWizardContext();
  const { dataView } = searchItems;

  return useMemo(
    () => getPivotDropdownOptions(dataView, runtimeMappings),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [runtimeMappings]
  );
};
export type PivotConfigOptions = ReturnType<typeof usePivotConfigOptions>;

export const getPivotConfigActions = (
  pivotConfigOptions: PivotConfigOptions,
  toastNotifications: NotificationsStart['toasts']
) => {
  const { rAddAggregation, rAddGroupBy, rDeleteAggregation, rDeleteGroupBy, rUpdateAggregation } =
    stepDefineSlice.actions;

  // The list of selected aggregations
  // const aggList = useWizardSelector((s) => s.stepDefine.aggList);
  // The list of selected group by fields
  // const groupByList = useWizardSelector((s) => s.stepDefine.groupByList);

  const { aggOptionsData, groupByOptionsData, fields } = pivotConfigOptions;

  const addGroupBy =
    (d: DropDownLabel[]): ThunkAction<void, StoreState, unknown, ReturnType<typeof rAddGroupBy>> =>
    (dispatch, getState) => {
      const { aggList, groupByList } = getState().stepDefine;
      const label: AggName = d[0].label;
      const config: PivotGroupByConfig = groupByOptionsData[label];
      const aggName: AggName = config.aggName;

      const aggNameConflictMessages = getAggNameConflictToastMessages(
        aggName,
        aggList,
        groupByList
      );
      if (aggNameConflictMessages.length > 0) {
        aggNameConflictMessages.forEach((m) => toastNotifications.addDanger(m));
        return;
      }

      dispatch(rAddGroupBy({ aggName, config }));
    };

  const updateGroupBy =
    (
      previousAggName: AggName,
      item: PivotGroupByConfig
    ): ThunkAction<void, StoreState, unknown, ReturnType<typeof rAddGroupBy>> =>
    (dispatch, getState) => {
      const { aggList, groupByList } = getState().stepDefine;
      const groupByListWithoutPrevious = { ...groupByList };
      delete groupByListWithoutPrevious[previousAggName];

      const aggNameConflictMessages = getAggNameConflictToastMessages(
        item.aggName,
        aggList,
        groupByListWithoutPrevious
      );
      if (aggNameConflictMessages.length > 0) {
        aggNameConflictMessages.forEach((m) => toastNotifications.addDanger(m));
        return;
      }

      dispatch(rAddGroupBy({ aggName: item.aggName, config: item }));
    };

  const deleteGroupBy = rDeleteGroupBy;

  /**
   * Adds an aggregation to the list.
   */
  const addAggregation =
    (
      d: DropDownLabel[]
    ): ThunkAction<void, StoreState, unknown, ReturnType<typeof rAddAggregation>> =>
    (dispatch, getState) => {
      const { aggList, groupByList } = getState().stepDefine;
      const label: AggName = d[0].label;
      const config: PivotAggsConfig = aggOptionsData[label];

      let aggName: AggName = config.aggName;

      if (isPivotAggConfigTopMetric(config)) {
        let suggestedSortField = [
          ...new Set(
            Object.values(groupByList).map((v) =>
              isPivotGroupByConfigWithUiSupport(v) ? v.field : undefined
            )
          ),
        ].find((v) => fields.find((x) => x.name === v)?.type === KBN_FIELD_TYPES.DATE);

        if (!suggestedSortField) {
          suggestedSortField = [
            ...new Set(
              Object.values(aggList)
                .map((v) => (isPivotAggConfigWithUiSupport(v) ? v.field : undefined))
                .flat()
                .filter(isDefined)
            ),
          ].find((v) => fields.find((x) => x.name === v)?.type === KBN_FIELD_TYPES.DATE);
        }

        if (suggestedSortField) {
          config.aggConfig.sortField = suggestedSortField;
          config.aggConfig.sortSettings = {};
          config.aggConfig.sortSettings.order = 'desc';
        }
      }

      if (aggList[aggName] && aggName === PIVOT_SUPPORTED_AGGS.TOP_METRICS) {
        // handle special case for naming top_metric aggs
        const regExp = new RegExp(`^${PIVOT_SUPPORTED_AGGS.TOP_METRICS}(\\d)*$`);
        const increment: number = Object.keys(aggList).reduce((acc, curr) => {
          const match = curr.match(regExp);
          if (!match || !match[1]) return acc;
          const n = Number(match[1]);
          return n > acc ? n : acc;
        }, 0 as number);

        aggName = `${PIVOT_SUPPORTED_AGGS.TOP_METRICS}${increment + 1}`;
        config.aggName = aggName;
      }

      const aggNameConflictMessages = getAggNameConflictToastMessages(
        aggName,
        aggList,
        groupByList
      );
      if (aggNameConflictMessages.length > 0) {
        aggNameConflictMessages.forEach((m) => toastNotifications.addDanger(m));
        return;
      }

      dispatch(rAddAggregation({ aggName, config }));
    };
  /**
   * Adds updated aggregation to the list
   */
  const updateAggregation =
    (
      previousAggName: AggName,
      item: PivotAggsConfig
    ): ThunkAction<void, StoreState, unknown, ReturnType<typeof rUpdateAggregation>> =>
    (dispatch, getState) => {
      const { aggList, groupByList } = getState().stepDefine;
      const aggListWithoutPrevious = { ...aggList };
      delete aggListWithoutPrevious[previousAggName];

      const aggNameConflictMessages = getAggNameConflictToastMessages(
        item.aggName,
        aggListWithoutPrevious,
        groupByList
      );
      if (aggNameConflictMessages.length > 0) {
        aggNameConflictMessages.forEach((m) => toastNotifications.addDanger(m));
        return;
      }

      dispatch(rUpdateAggregation({ previousAggName, config: item }));
    };
  /**
   * Adds sub-aggregation to the aggregation item
   */
  const addSubAggregation =
    (
      item: PivotAggsConfig,
      d: DropDownLabel[]
    ): ThunkAction<void, StoreState, unknown, Action<unknown>> =>
    (dispatch) => {
      if (!item.isSubAggsSupported) {
        throw new Error(`Aggregation "${item.agg}" does not support sub-aggregations`);
      }
      const label: AggName = d[0].label;
      const config: PivotAggsConfig = aggOptionsData[label];

      item.subAggs = item.subAggs ?? {};

      const aggNameConflictMessages = getAggNameConflictToastMessages(
        config.aggName,
        item.subAggs,
        {}
      );
      if (aggNameConflictMessages.length > 0) {
        aggNameConflictMessages.forEach((m) => toastNotifications.addDanger(m));
        return;
      }

      item.subAggs[config.aggName] = config;

      const newRootItem = cloneAggItem(getRootAggregation(item));
      dispatch(updateAggregation(newRootItem.aggName, newRootItem));
    };

  /**
   * Updates sub-aggregation of the aggregation item
   */
  const updateSubAggregation =
    (
      prevSubItemName: AggName,
      subItem: PivotAggsConfig
    ): ThunkAction<void, StoreState, unknown, Action<unknown>> =>
    (dispatch) => {
      const parent = subItem.parentAgg;
      if (!parent || !parent.subAggs) {
        throw new Error('No parent aggregation reference found');
      }

      const { [prevSubItemName]: deleted, ...newSubAgg } = parent.subAggs;

      const aggNameConflictMessages = getAggNameConflictToastMessages(
        subItem.aggName,
        newSubAgg,
        {}
      );
      if (aggNameConflictMessages.length > 0) {
        aggNameConflictMessages.forEach((m) => toastNotifications.addDanger(m));
        return;
      }

      parent.subAggs = {
        ...newSubAgg,
        [subItem.aggName]: subItem,
      };
      const newRootItem = cloneAggItem(getRootAggregation(subItem));
      dispatch(updateAggregation(newRootItem.aggName, newRootItem));
    };

  /**
   * Deletes sub-aggregation of the aggregation item
   */
  const deleteSubAggregation =
    (
      item: PivotAggsConfig,
      subAggName: string
    ): ThunkAction<void, StoreState, unknown, Action<unknown>> =>
    (dispatch) => {
      if (!item.subAggs || !item.subAggs[subAggName]) {
        throw new Error('Unable to delete a sub-agg');
      }
      delete item.subAggs[subAggName];
      const newRootItem = cloneAggItem(getRootAggregation(item));
      dispatch(updateAggregation(newRootItem.aggName, newRootItem));
    };

  /**
   * Deletes aggregation from the list
   */
  const deleteAggregation = rDeleteAggregation;

  return {
    addAggregation,
    addGroupBy,
    addSubAggregation,
    updateSubAggregation,
    deleteSubAggregation,
    deleteAggregation,
    deleteGroupBy,
    updateAggregation,
    updateGroupBy,
  };
};
