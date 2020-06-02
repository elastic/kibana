/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState } from 'react';

import { dictionaryToArray } from '../../../../../../../common/types/common';

import { useToastNotifications } from '../../../../../app_dependencies';
import { AggName, DropDownLabel, PivotAggsConfig, PivotGroupByConfig } from '../../../../../common';

import {
  getAggNameConflictToastMessages,
  getPivotDropdownOptions,
  StepDefineExposedState,
} from '../common';
import { StepDefineFormProps } from '../step_define_form';

export const usePivotConfig = (
  defaults: StepDefineExposedState,
  indexPattern: StepDefineFormProps['searchItems']['indexPattern']
) => {
  const toastNotifications = useToastNotifications();

  const {
    aggOptions,
    aggOptionsData,
    groupByOptions,
    groupByOptionsData,
  } = getPivotDropdownOptions(indexPattern);

  // The list of selected group by fields
  const [groupByList, setGroupByList] = useState(defaults.groupByList);

  const addGroupBy = (d: DropDownLabel[]) => {
    const label: AggName = d[0].label;
    const config: PivotGroupByConfig = groupByOptionsData[label];
    const aggName: AggName = config.aggName;

    const aggNameConflictMessages = getAggNameConflictToastMessages(aggName, aggList, groupByList);
    if (aggNameConflictMessages.length > 0) {
      aggNameConflictMessages.forEach((m) => toastNotifications.addDanger(m));
      return;
    }

    groupByList[aggName] = config;
    setGroupByList({ ...groupByList });
  };

  const updateGroupBy = (previousAggName: AggName, item: PivotGroupByConfig) => {
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
  };

  const deleteGroupBy = (aggName: AggName) => {
    delete groupByList[aggName];
    setGroupByList({ ...groupByList });
  };

  // The list of selected aggregations
  const [aggList, setAggList] = useState(defaults.aggList);

  const addAggregation = (d: DropDownLabel[]) => {
    const label: AggName = d[0].label;
    const config: PivotAggsConfig = aggOptionsData[label];
    const aggName: AggName = config.aggName;

    const aggNameConflictMessages = getAggNameConflictToastMessages(aggName, aggList, groupByList);
    if (aggNameConflictMessages.length > 0) {
      aggNameConflictMessages.forEach((m) => toastNotifications.addDanger(m));
      return;
    }

    aggList[aggName] = config;
    setAggList({ ...aggList });
  };

  const updateAggregation = (previousAggName: AggName, item: PivotAggsConfig) => {
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
  };

  const deleteAggregation = (aggName: AggName) => {
    delete aggList[aggName];
    setAggList({ ...aggList });
  };

  const pivotAggsArr = dictionaryToArray(aggList);
  const pivotGroupByArr = dictionaryToArray(groupByList);

  const valid = pivotGroupByArr.length > 0 && pivotAggsArr.length > 0;

  return {
    actions: {
      addAggregation,
      addGroupBy,
      deleteAggregation,
      deleteGroupBy,
      setAggList,
      setGroupByList,
      updateAggregation,
      updateGroupBy,
    },
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
};
