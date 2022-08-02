/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';

import { KBN_FIELD_TYPES } from '@kbn/data-plugin/common';
import { AggName } from '../../../../../../../common/types/aggregations';
import { dictionaryToArray } from '../../../../../../../common/types/common';

import { useToastNotifications } from '../../../../../app_dependencies';
import {
  DropDownLabel,
  getRequestPayload,
  isPivotGroupByConfigWithUiSupport,
  PivotAggsConfig,
  PivotAggsConfigDict,
  PivotGroupByConfig,
} from '../../../../../common';

import {
  getAggNameConflictToastMessages,
  getPivotDropdownOptions,
  StepDefineExposedState,
} from '../common';
import { StepDefineFormProps } from '../step_define_form';
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

export const usePivotConfig = (
  defaults: StepDefineExposedState,
  dataView: StepDefineFormProps['searchItems']['dataView']
) => {
  const toastNotifications = useToastNotifications();

  const { aggOptions, aggOptionsData, groupByOptions, groupByOptionsData, fields } = useMemo(
    () => getPivotDropdownOptions(dataView, defaults.runtimeMappings),
    [defaults.runtimeMappings, dataView]
  );

  // The list of selected aggregations
  const [aggList, setAggList] = useState(defaults.aggList);
  // The list of selected group by fields
  const [groupByList, setGroupByList] = useState(defaults.groupByList);

  const addGroupBy = useCallback(
    (d: DropDownLabel[]) => {
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

      groupByList[aggName] = config;
      setGroupByList({ ...groupByList });
    },
    [aggList, groupByList, groupByOptionsData, toastNotifications]
  );

  const updateGroupBy = useCallback(
    (previousAggName: AggName, item: PivotGroupByConfig) => {
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

      groupByListWithoutPrevious[item.aggName] = item;
      setGroupByList(groupByListWithoutPrevious);
    },
    [aggList, groupByList, toastNotifications]
  );

  const deleteGroupBy = useCallback(
    (aggName: AggName) => {
      delete groupByList[aggName];
      setGroupByList({ ...groupByList });
    },
    [groupByList]
  );

  /**
   * Adds an aggregation to the list.
   */
  const addAggregation = useCallback(
    (d: DropDownLabel[]) => {
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

      aggList[aggName] = config;
      setAggList({ ...aggList });
    },
    [aggList, aggOptionsData, groupByList, toastNotifications, fields]
  );

  /**
   * Adds updated aggregation to the list
   */
  const updateAggregation = useCallback(
    (previousAggName: AggName, item: PivotAggsConfig) => {
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
      aggListWithoutPrevious[item.aggName] = item;
      setAggList(aggListWithoutPrevious);
    },
    [aggList, groupByList, toastNotifications]
  );

  /**
   * Adds sub-aggregation to the aggregation item
   */
  const addSubAggregation = useCallback(
    (item: PivotAggsConfig, d: DropDownLabel[]) => {
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
      updateAggregation(newRootItem.aggName, newRootItem);
    },
    [aggOptionsData, toastNotifications, updateAggregation]
  );

  /**
   * Updates sub-aggregation of the aggregation item
   */
  const updateSubAggregation = useCallback(
    (prevSubItemName: AggName, subItem: PivotAggsConfig) => {
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
      updateAggregation(newRootItem.aggName, newRootItem);
    },
    [toastNotifications, updateAggregation]
  );

  /**
   * Deletes sub-aggregation of the aggregation item
   */
  const deleteSubAggregation = useCallback(
    (item: PivotAggsConfig, subAggName: string) => {
      if (!item.subAggs || !item.subAggs[subAggName]) {
        throw new Error('Unable to delete a sub-agg');
      }
      delete item.subAggs[subAggName];
      const newRootItem = cloneAggItem(getRootAggregation(item));
      updateAggregation(newRootItem.aggName, newRootItem);
    },
    [updateAggregation]
  );

  /**
   * Deletes aggregation from the list
   */
  const deleteAggregation = useCallback(
    (aggName: AggName) => {
      delete aggList[aggName];
      setAggList({ ...aggList });
    },
    [aggList]
  );

  const pivotAggsArr = useMemo(() => dictionaryToArray(aggList), [aggList]);
  const pivotGroupByArr = useMemo(() => dictionaryToArray(groupByList), [groupByList]);

  const requestPayload = useMemo(
    () => getRequestPayload(pivotAggsArr, pivotGroupByArr),
    [pivotAggsArr, pivotGroupByArr]
  );

  const validationStatus = useMemo(() => {
    return validatePivotConfig(requestPayload.pivot);
  }, [requestPayload]);

  const actions = useMemo(() => {
    return {
      addAggregation,
      addGroupBy,
      addSubAggregation,
      updateSubAggregation,
      deleteSubAggregation,
      deleteAggregation,
      deleteGroupBy,
      setAggList,
      setGroupByList,
      updateAggregation,
      updateGroupBy,
    };
  }, [
    addAggregation,
    addGroupBy,
    addSubAggregation,
    deleteAggregation,
    deleteGroupBy,
    deleteSubAggregation,
    updateAggregation,
    updateGroupBy,
    updateSubAggregation,
  ]);

  return useMemo(() => {
    return {
      actions,
      state: {
        aggList,
        aggOptions,
        aggOptionsData,
        groupByList,
        groupByOptions,
        groupByOptionsData,
        pivotAggsArr,
        pivotGroupByArr,
        validationStatus,
        requestPayload,
        fields,
      },
    };
  }, [
    actions,
    aggList,
    aggOptions,
    aggOptionsData,
    groupByList,
    groupByOptions,
    groupByOptionsData,
    pivotAggsArr,
    pivotGroupByArr,
    validationStatus,
    requestPayload,
    fields,
  ]);
};

export type PivotService = ReturnType<typeof usePivotConfig>;
