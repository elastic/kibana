/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useMemo, useState } from 'react';

import { dictionaryToArray } from '../../../../../../../common/types/common';

import { useToastNotifications } from '../../../../../app_dependencies';
import {
  AggName,
  DropDownLabel,
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
  indexPattern: StepDefineFormProps['searchItems']['indexPattern']
) => {
  const toastNotifications = useToastNotifications();

  const { aggOptions, aggOptionsData, groupByOptions, groupByOptionsData } = useMemo(
    () => getPivotDropdownOptions(indexPattern),
    [indexPattern]
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

      aggList[aggName] = config;
      setAggList({ ...aggList });
    },
    [aggList, aggOptionsData, groupByList, toastNotifications]
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

  const valid = pivotGroupByArr.length > 0 && pivotAggsArr.length > 0;

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
        valid,
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
    valid,
  ]);
};
