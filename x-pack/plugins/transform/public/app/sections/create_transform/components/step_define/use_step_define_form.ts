/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';

import { esKuery, esQuery, Query } from '../../../../../../../../../src/plugins/data/public';

import { useXJsonMode } from '../../../../../../../../../src/plugins/es_ui_shared/static/ace_x_json/hooks';

import { dictionaryToArray } from '../../../../../../common/types/common';

import { useToastNotifications } from '../../../../app_dependencies';
import {
  getPivotQuery,
  getPreviewRequestBody,
  AggName,
  DropDownLabel,
  PivotAggDict,
  PivotAggsConfig,
  PivotAggsConfigDict,
  PivotGroupByDict,
  PivotGroupByConfig,
  PivotGroupByConfigDict,
  PivotSupportedGroupByAggs,
  PIVOT_SUPPORTED_AGGS,
} from '../../../../common';

import {
  defaultSearch,
  getAggNameConflictToastMessages,
  getDefaultStepDefineState,
  getPivotDropdownOptions,
  ErrorMessage,
  StepDefineExposedState,
  QUERY_LANGUAGE_KUERY,
  QUERY_LANGUAGE_LUCENE,
  QUERY_LANGUAGE,
} from './common';

import { StepDefineFormProps } from './step_define_form';

export const useStepDefineForm = ({ overrides, onChange, searchItems }: StepDefineFormProps) => {
  const toastNotifications = useToastNotifications();

  const defaults = { ...getDefaultStepDefineState(searchItems), ...overrides };

  // The internal state of the input query bar updated on every key stroke.
  const [searchInput, setSearchInput] = useState<Query>({
    query: defaults.searchString || '',
    language: defaults.searchLanguage,
  });
  const [errorMessage, setErrorMessage] = useState<ErrorMessage | undefined>(undefined);

  // The state of the input query bar updated on every submit and to be exposed.
  const [searchLanguage, setSearchLanguage] = useState<StepDefineExposedState['searchLanguage']>(
    defaults.searchLanguage
  );
  const [searchString, setSearchString] = useState<StepDefineExposedState['searchString']>(
    defaults.searchString
  );
  const [searchQuery, setSearchQuery] = useState(defaults.searchQuery);

  const { indexPattern } = searchItems;

  const searchChangeHandler = (query: Query) => setSearchInput(query);
  const searchSubmitHandler = (query: Query) => {
    setSearchLanguage(query.language as QUERY_LANGUAGE);
    setSearchString(query.query !== '' ? (query.query as string) : undefined);
    try {
      switch (query.language) {
        case QUERY_LANGUAGE_KUERY:
          setSearchQuery(
            esKuery.toElasticsearchQuery(
              esKuery.fromKueryExpression(query.query as string),
              indexPattern
            )
          );
          return;
        case QUERY_LANGUAGE_LUCENE:
          setSearchQuery(esQuery.luceneStringToDsl(query.query as string));
          return;
      }
    } catch (e) {
      setErrorMessage({ query: query.query as string, message: e.message });
    }
  };

  // The list of selected group by fields
  const [groupByList, setGroupByList] = useState(defaults.groupByList);

  const {
    groupByOptions,
    groupByOptionsData,
    aggOptions,
    aggOptionsData,
  } = getPivotDropdownOptions(indexPattern);

  const addGroupBy = (d: DropDownLabel[]) => {
    const label: AggName = d[0].label;
    const config: PivotGroupByConfig = groupByOptionsData[label];
    const aggName: AggName = config.aggName;

    const aggNameConflictMessages = getAggNameConflictToastMessages(aggName, aggList, groupByList);
    if (aggNameConflictMessages.length > 0) {
      aggNameConflictMessages.forEach(m => toastNotifications.addDanger(m));
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
      aggNameConflictMessages.forEach(m => toastNotifications.addDanger(m));
      return;
    }

    groupByListWithoutPrevious[item.aggName] = item;
    setGroupByList({ ...groupByListWithoutPrevious });
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
      aggNameConflictMessages.forEach(m => toastNotifications.addDanger(m));
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
      aggNameConflictMessages.forEach(m => toastNotifications.addDanger(m));
      return;
    }

    aggListWithoutPrevious[item.aggName] = item;
    setAggList({ ...aggListWithoutPrevious });
  };

  const deleteAggregation = (aggName: AggName) => {
    delete aggList[aggName];
    setAggList({ ...aggList });
  };

  const pivotAggsArr = dictionaryToArray(aggList);
  const pivotGroupByArr = dictionaryToArray(groupByList);
  const pivotQuery = getPivotQuery(searchQuery);

  // Advanced editor for pivot config state
  const [isAdvancedEditorSwitchModalVisible, setAdvancedEditorSwitchModalVisible] = useState(false);
  const [
    isAdvancedPivotEditorApplyButtonEnabled,
    setAdvancedPivotEditorApplyButtonEnabled,
  ] = useState(false);
  const [isAdvancedPivotEditorEnabled, setAdvancedPivotEditorEnabled] = useState(
    defaults.isAdvancedPivotEditorEnabled
  );
  // Advanced editor for source config state
  const [sourceConfigUpdated, setSourceConfigUpdated] = useState(defaults.sourceConfigUpdated);
  const [
    isAdvancedSourceEditorSwitchModalVisible,
    setAdvancedSourceEditorSwitchModalVisible,
  ] = useState(false);
  const [isAdvancedSourceEditorEnabled, setAdvancedSourceEditorEnabled] = useState(
    defaults.isAdvancedSourceEditorEnabled
  );
  const [
    isAdvancedSourceEditorApplyButtonEnabled,
    setAdvancedSourceEditorApplyButtonEnabled,
  ] = useState(false);

  const previewRequest = getPreviewRequestBody(
    indexPattern.title,
    pivotQuery,
    pivotGroupByArr,
    pivotAggsArr
  );
  // pivot config
  const stringifiedPivotConfig = JSON.stringify(previewRequest.pivot, null, 2);
  const [advancedEditorConfigLastApplied, setAdvancedEditorConfigLastApplied] = useState(
    stringifiedPivotConfig
  );

  const {
    convertToJson,
    setXJson: setAdvancedEditorConfig,
    xJson: advancedEditorConfig,
    xJsonMode,
  } = useXJsonMode(stringifiedPivotConfig);

  useEffect(() => {
    setAdvancedEditorConfig(stringifiedPivotConfig);
  }, [setAdvancedEditorConfig, stringifiedPivotConfig]);

  // source config
  const stringifiedSourceConfig = JSON.stringify(previewRequest.source.query, null, 2);
  const [
    advancedEditorSourceConfigLastApplied,
    setAdvancedEditorSourceConfigLastApplied,
  ] = useState(stringifiedSourceConfig);
  const [advancedEditorSourceConfig, setAdvancedEditorSourceConfig] = useState(
    stringifiedSourceConfig
  );

  const applyAdvancedSourceEditorChanges = () => {
    const sourceConfig = JSON.parse(advancedEditorSourceConfig);
    const prettySourceConfig = JSON.stringify(sourceConfig, null, 2);
    setSearchQuery(sourceConfig);
    setSourceConfigUpdated(true);
    setAdvancedEditorSourceConfig(prettySourceConfig);
    setAdvancedEditorSourceConfigLastApplied(prettySourceConfig);
    setAdvancedSourceEditorApplyButtonEnabled(false);
  };

  const applyAdvancedPivotEditorChanges = () => {
    const pivotConfig = JSON.parse(convertToJson(advancedEditorConfig));

    const newGroupByList: PivotGroupByConfigDict = {};
    if (pivotConfig !== undefined && pivotConfig.group_by !== undefined) {
      Object.entries(pivotConfig.group_by).forEach(d => {
        const aggName = d[0];
        const aggConfig = d[1] as PivotGroupByDict;
        const aggConfigKeys = Object.keys(aggConfig);
        const agg = aggConfigKeys[0] as PivotSupportedGroupByAggs;
        newGroupByList[aggName] = {
          ...aggConfig[agg],
          agg,
          aggName,
          dropDownName: '',
        };
      });
    }
    setGroupByList(newGroupByList);

    const newAggList: PivotAggsConfigDict = {};
    if (pivotConfig !== undefined && pivotConfig.aggregations !== undefined) {
      Object.entries(pivotConfig.aggregations).forEach(d => {
        const aggName = d[0];
        const aggConfig = d[1] as PivotAggDict;
        const aggConfigKeys = Object.keys(aggConfig);
        const agg = aggConfigKeys[0] as PIVOT_SUPPORTED_AGGS;
        newAggList[aggName] = {
          ...aggConfig[agg],
          agg,
          aggName,
          dropDownName: '',
        };
      });
    }
    setAggList(newAggList);

    setAdvancedEditorConfigLastApplied(advancedEditorConfig);
    setAdvancedPivotEditorApplyButtonEnabled(false);
  };

  const toggleAdvancedEditor = () => {
    setAdvancedEditorConfig(advancedEditorConfig);
    setAdvancedPivotEditorEnabled(!isAdvancedPivotEditorEnabled);
    setAdvancedPivotEditorApplyButtonEnabled(false);
    if (isAdvancedPivotEditorEnabled === false) {
      setAdvancedEditorConfigLastApplied(advancedEditorConfig);
    }
  };
  // If switching to KQL after updating via editor - reset search
  const toggleAdvancedSourceEditor = (reset = false) => {
    if (reset === true) {
      setSearchQuery(defaultSearch);
      setSourceConfigUpdated(false);
    }
    if (isAdvancedSourceEditorEnabled === false) {
      setAdvancedEditorSourceConfigLastApplied(advancedEditorSourceConfig);
    }

    setAdvancedSourceEditorEnabled(!isAdvancedSourceEditorEnabled);
    setAdvancedSourceEditorApplyButtonEnabled(false);
  };

  const valid = pivotGroupByArr.length > 0 && pivotAggsArr.length > 0;

  useEffect(() => {
    const previewRequestUpdate = getPreviewRequestBody(
      indexPattern.title,
      pivotQuery,
      pivotGroupByArr,
      pivotAggsArr
    );

    const stringifiedSourceConfigUpdate = JSON.stringify(
      previewRequestUpdate.source.query,
      null,
      2
    );
    setAdvancedEditorSourceConfig(stringifiedSourceConfigUpdate);

    onChange({
      aggList,
      groupByList,
      isAdvancedPivotEditorEnabled,
      isAdvancedSourceEditorEnabled,
      searchLanguage,
      searchString,
      searchQuery,
      sourceConfigUpdated,
      valid,
    });
    // custom comparison
    /* eslint-disable react-hooks/exhaustive-deps */
  }, [
    JSON.stringify(pivotAggsArr),
    JSON.stringify(pivotGroupByArr),
    isAdvancedPivotEditorEnabled,
    isAdvancedSourceEditorEnabled,
    searchLanguage,
    searchString,
    searchQuery,
    valid,
    /* eslint-enable react-hooks/exhaustive-deps */
  ]);

  return {
    actions: {
      searchChangeHandler,
      searchSubmitHandler,
      addGroupBy,
      updateGroupBy,
      deleteGroupBy,
      addAggregation,
      updateAggregation,
      deleteAggregation,
      setAdvancedEditorSwitchModalVisible,
      setAdvancedSourceEditorSwitchModalVisible,
      applyAdvancedSourceEditorChanges,
      applyAdvancedPivotEditorChanges,
      toggleAdvancedEditor,
      toggleAdvancedSourceEditor,
      setErrorMessage,
      setSearchString,
      setAdvancedEditorSourceConfig,
      setAdvancedSourceEditorApplyButtonEnabled,
      setAdvancedEditorConfig,
      setAdvancedPivotEditorApplyButtonEnabled,
      convertToJson,
    },
    state: {
      searchInput,
      errorMessage,
      groupByOptions,
      aggOptions,
      isAdvancedEditorSwitchModalVisible,
      isAdvancedPivotEditorApplyButtonEnabled,
      isAdvancedSourceEditorSwitchModalVisible,
      isAdvancedSourceEditorApplyButtonEnabled,
      advancedEditorConfigLastApplied,
      xJsonMode,
      advancedEditorSourceConfigLastApplied,
      pivotQuery,
      aggList,
      groupByList,
      isAdvancedSourceEditorEnabled,
      advancedEditorSourceConfig,
      sourceConfigUpdated,
      isAdvancedPivotEditorEnabled,
      groupByOptionsData,
      aggOptionsData,
      advancedEditorConfig,
      valid,
      previewRequest,
    },
  };
};
