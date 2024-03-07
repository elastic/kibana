/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { useMemo } from 'react';
import type { Action } from 'redux';
import type { ThunkAction } from 'redux-thunk';
import { nanoid } from '@reduxjs/toolkit';

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
import { useDataView } from '../../wizard/wizard';
import {
  isPivotAggConfigTopMetric,
  isPivotAggsWithExtendedForm,
} from '../../../../../common/pivot_aggs';
import { TransformPivotConfig } from '../../../../../../../common/types/transform';
import { PIVOT_SUPPORTED_AGGS } from '../../../../../../../common/types/pivot_aggs';
import { isPivotAggConfigWithUiSupport } from '../../../../../common/pivot_group_by';
import { getAggConfigUtils } from '../common/agg_utils';

/**
 * Checks if the aggregations collection is invalid.
 */
function isConfigInvalid(aggsArray: PivotAggsConfig[]): boolean {
  return aggsArray.some((agg) => {
    if (!isPivotAggsWithExtendedForm(agg)) return false;
    const utils = getAggConfigUtils(agg);
    return isPivotAggsWithExtendedForm(agg) && !utils?.isValid();
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

export const usePivotConfigOptions = () => {
  const dataView = useDataView();
  const runtimeMappings = useWizardSelector((s) => s.advancedRuntimeMappingsEditor.runtimeMappings);

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

  const { aggOptionsData, groupByOptionsData, fields } = pivotConfigOptions;

  const addGroupBy =
    (d: DropDownLabel[]): ThunkAction<void, StoreState, unknown, ReturnType<typeof rAddGroupBy>> =>
    (dispatch, getState) => {
      const { aggList, groupByList } = getState().stepDefine;
      const label: AggName = d[0].label;
      const config: PivotGroupByConfig = groupByOptionsData[label];
      config.groupById = nanoid();
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

      dispatch(rAddGroupBy(config));
    };

  const updateGroupBy =
    (
      item: PivotGroupByConfig
    ): ThunkAction<void, StoreState, unknown, ReturnType<typeof rAddGroupBy>> =>
    (dispatch, getState) => {
      const { aggList, groupByList } = getState().stepDefine;
      const groupByListWithoutPrevious = { ...groupByList };

      const aggNameConflictMessages = getAggNameConflictToastMessages(
        item.aggName,
        aggList,
        groupByListWithoutPrevious
      );
      if (aggNameConflictMessages.length > 0) {
        aggNameConflictMessages.forEach((m) => toastNotifications.addDanger(m));
        return;
      }

      dispatch(rAddGroupBy(item));
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
      config.aggId = nanoid();

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

      if (aggName === PIVOT_SUPPORTED_AGGS.TOP_METRICS) {
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

      dispatch(rAddAggregation(config));
    };
  /**
   * Adds updated aggregation to the list
   */
  const updateAggregation =
    (
      item: PivotAggsConfig
    ): ThunkAction<void, StoreState, unknown, ReturnType<typeof rUpdateAggregation>> =>
    (dispatch, getState) => {
      const { aggList, groupByList } = getState().stepDefine;
      const aggListWithoutPrevious = { ...aggList };

      const aggNameConflictMessages = getAggNameConflictToastMessages(
        item.aggName,
        aggListWithoutPrevious,
        groupByList
      );
      if (aggNameConflictMessages.length > 0) {
        aggNameConflictMessages.forEach((m) => toastNotifications.addDanger(m));
        return;
      }

      dispatch(rUpdateAggregation(item));
    };
  /**
   * Adds sub-aggregation to the aggregation item
   */
  const addSubAggregation =
    (
      d: DropDownLabel[],
      parentAggId: string
    ): ThunkAction<void, StoreState, unknown, Action<unknown>> =>
    (dispatch, getState) => {
      const fullState = getState();
      const parentAggItem = fullState.stepDefine.aggList[parentAggId];
      const parentItem = cloneDeep(parentAggItem);
      if (!parentItem.isSubAggsSupported) {
        throw new Error(`Aggregation "${parentItem.agg}" does not support sub-aggregations`);
      }
      const label: AggName = d[0].label;
      const config: PivotAggsConfig = aggOptionsData[label];
      config.aggId = nanoid();
      config.parentAggId = parentAggId;

      parentItem.subAggs = parentItem.subAggs ?? [];
      const subAggsItemsDict = Object.values(fullState.stepDefine.aggList)
        .filter((agg) => agg.parentAggId === parentItem.aggId)
        .reduce<PivotAggsConfigDict>((p, c) => {
          p[c.aggId] = c;
          return p;
        }, {});

      const aggNameConflictMessages = getAggNameConflictToastMessages(
        config.aggName,
        subAggsItemsDict,
        {}
      );
      if (aggNameConflictMessages.length > 0) {
        aggNameConflictMessages.forEach((m) => toastNotifications.addDanger(m));
        return;
      }

      parentItem.subAggs.push(config.aggId);
      dispatch(rAddAggregation(config));
      dispatch(updateAggregation(parentItem));
    };

  /**
   * Updates sub-aggregation of the aggregation item
   */
  const updateSubAggregation =
    (subItem: PivotAggsConfig): ThunkAction<void, StoreState, unknown, Action<unknown>> =>
    (dispatch, getState) => {
      const fullState = getState();
      const parent = subItem.parentAggId && fullState.stepDefine.aggList[subItem.parentAggId];
      if (!parent || !parent.subAggs) {
        throw new Error('No parent aggregation reference found');
      }

      const otherSubAggsItemsDict = Object.values(fullState.stepDefine.aggList)
        .filter((agg) => agg.parentAggId === parent.aggId && agg.aggId !== subItem.aggId)
        .reduce<PivotAggsConfigDict>((p, c) => {
          p[c.aggId] = c;
          return p;
        }, {});

      const aggNameConflictMessages = getAggNameConflictToastMessages(
        subItem.aggName,
        otherSubAggsItemsDict,
        {}
      );
      if (aggNameConflictMessages.length > 0) {
        aggNameConflictMessages.forEach((m) => toastNotifications.addDanger(m));
        return;
      }

      dispatch(updateAggregation(subItem));
    };

  /**
   * Deletes sub-aggregation of the aggregation item
   */
  const deleteSubAggregation =
    (subAggId: string): ThunkAction<void, StoreState, unknown, Action<unknown>> =>
    (dispatch, getState) => {
      dispatch(rDeleteAggregation(subAggId));

      const fullState = getState();
      const { aggList } = fullState.stepDefine;

      Object.values(aggList).forEach((agg) => {
        if (agg.parentAggId === subAggId) {
          dispatch(rDeleteAggregation(agg.aggId));
          return;
        }

        if (agg.subAggs && agg.subAggs?.includes(subAggId)) {
          agg.subAggs = agg.subAggs.filter((sa) => sa === subAggId);
          dispatch(rUpdateAggregation(agg));
        }
      });
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
