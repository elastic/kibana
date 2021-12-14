/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiComboBoxOptionOption, EuiSuperSelectOption } from '@elastic/eui';
import { getScopePatternListSelection } from '../../store/sourcerer/helpers';
import { sourcererModel } from '../../store/sourcerer';
import { getDataViewSelectOptions, getPatternListWithoutSignals } from './helpers';
import { SourcererScopeName } from '../../store/sourcerer/model';

interface UsePickIndexPatternsProps {
  dataViewId: string | null;
  defaultDataViewId: string;
  isOnlyDetectionAlerts: boolean;
  kibanaDataViews: sourcererModel.SourcererModel['kibanaDataViews'];
  missingPatterns: string[];
  scopeId: sourcererModel.SourcererScopeName;
  selectedDataViewId: string | null;
  selectedPatterns: string[];
  signalIndexName: string | null;
}

export type ModifiedTypes = 'modified' | 'alerts' | 'deprecated' | 'missingPatterns' | '';

interface UsePickIndexPatterns {
  allOptions: Array<EuiComboBoxOptionOption<string>>;
  dataViewSelectOptions: Array<EuiSuperSelectOption<string>>;
  isModified: ModifiedTypes;
  onChangeCombo: (newSelectedDataViewId: Array<EuiComboBoxOptionOption<string>>) => void;
  renderOption: ({ value }: EuiComboBoxOptionOption<string>) => React.ReactElement;
  selectedOptions: Array<EuiComboBoxOptionOption<string>>;
  setIndexPatternsByDataView: (newSelectedDataViewId: string, isAlerts?: boolean) => void;
}

const patternListToOptions = (patternList: string[], selectablePatterns?: string[]) =>
  patternList.sort().map((s) => ({
    label: s,
    value: s,
    ...(selectablePatterns != null ? { disabled: !selectablePatterns.includes(s) } : {}),
  }));

export const usePickIndexPatterns = ({
  dataViewId,
  defaultDataViewId,
  isOnlyDetectionAlerts,
  kibanaDataViews,
  missingPatterns,
  scopeId,
  selectedDataViewId,
  selectedPatterns,
  signalIndexName,
}: UsePickIndexPatternsProps): UsePickIndexPatterns => {
  const alertsOptions = useMemo(
    () => (signalIndexName ? patternListToOptions([signalIndexName]) : []),
    [signalIndexName]
  );

  const { allPatterns, selectablePatterns } = useMemo<{
    allPatterns: string[];
    selectablePatterns: string[];
  }>(() => {
    if (isOnlyDetectionAlerts && signalIndexName) {
      return {
        allPatterns: [signalIndexName],
        selectablePatterns: [signalIndexName],
      };
    }
    const theDataView = kibanaDataViews.find((dataView) => dataView.id === dataViewId);

    if (theDataView == null) {
      return {
        allPatterns: [],
        selectablePatterns: [],
      };
    }

    const titleAsList = [...new Set(theDataView.title.split(','))];

    return scopeId === sourcererModel.SourcererScopeName.default
      ? {
          allPatterns: getPatternListWithoutSignals(titleAsList, signalIndexName),
          selectablePatterns: getPatternListWithoutSignals(
            theDataView.patternList,
            signalIndexName
          ),
        }
      : {
          allPatterns: titleAsList,
          selectablePatterns: theDataView.patternList,
        };
  }, [dataViewId, isOnlyDetectionAlerts, kibanaDataViews, scopeId, signalIndexName]);

  const allOptions = useMemo(
    () => patternListToOptions(allPatterns, selectablePatterns),
    [allPatterns, selectablePatterns]
  );
  const [selectedOptions, setSelectedOptions] = useState<Array<EuiComboBoxOptionOption<string>>>(
    isOnlyDetectionAlerts ? alertsOptions : patternListToOptions(selectedPatterns)
  );

  const getDefaultSelectedOptionsByDataView = useCallback(
    (id: string, isAlerts: boolean = false): Array<EuiComboBoxOptionOption<string>> =>
      scopeId === SourcererScopeName.detections || isAlerts
        ? alertsOptions
        : patternListToOptions(
            getScopePatternListSelection(
              kibanaDataViews.find((dataView) => dataView.id === id),
              scopeId,
              signalIndexName,
              id === defaultDataViewId
            )
          ),
    [alertsOptions, kibanaDataViews, scopeId, signalIndexName, defaultDataViewId]
  );

  const defaultSelectedPatternsAsOptions = useMemo(
    () => (dataViewId != null ? getDefaultSelectedOptionsByDataView(dataViewId) : []),
    [dataViewId, getDefaultSelectedOptionsByDataView]
  );

  const [isModified, setIsModified] = useState<ModifiedTypes>(
    dataViewId == null ? 'deprecated' : missingPatterns.length > 0 ? 'missingPatterns' : ''
  );
  const onSetIsModified = useCallback(
    (patterns: string[], id: string | null) => {
      if (id == null) {
        return setIsModified('deprecated');
      }
      if (missingPatterns.length > 0) {
        return setIsModified('missingPatterns');
      }
      if (isOnlyDetectionAlerts) {
        return setIsModified('alerts');
      }
      const isPatternsModified =
        defaultSelectedPatternsAsOptions.length !== patterns.length ||
        !defaultSelectedPatternsAsOptions.every((option) =>
          patterns.find((pattern) => option.value === pattern)
        );
      return setIsModified(isPatternsModified ? 'modified' : '');
    },
    [defaultSelectedPatternsAsOptions, isOnlyDetectionAlerts, missingPatterns.length]
  );

  useEffect(() => {
    setSelectedOptions(
      scopeId === SourcererScopeName.detections
        ? alertsOptions
        : patternListToOptions(selectedPatterns)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPatterns, scopeId]);
  // when scope updates, check modified to set/remove alerts label
  useEffect(() => {
    onSetIsModified(
      selectedPatterns.map((pattern) => pattern),
      selectedDataViewId
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDataViewId, missingPatterns, scopeId, selectedPatterns]);

  const onChangeCombo = useCallback((newSelectedOptions) => {
    setSelectedOptions(newSelectedOptions);
  }, []);

  const renderOption = useCallback(
    ({ value }) => <span data-test-subj="sourcerer-combo-option">{value}</span>,
    []
  );

  const setIndexPatternsByDataView = (newSelectedDataViewId: string, isAlerts?: boolean) => {
    setSelectedOptions(getDefaultSelectedOptionsByDataView(newSelectedDataViewId, isAlerts));
  };

  const dataViewSelectOptions = useMemo(
    () =>
      dataViewId != null
        ? getDataViewSelectOptions({
            dataViewId,
            defaultDataViewId,
            isModified: isModified === 'modified',
            isOnlyDetectionAlerts,
            kibanaDataViews,
          })
        : [],
    [dataViewId, defaultDataViewId, isModified, isOnlyDetectionAlerts, kibanaDataViews]
  );

  return {
    allOptions,
    dataViewSelectOptions,
    isModified,
    onChangeCombo,
    renderOption,
    selectedOptions,
    setIndexPatternsByDataView,
  };
};
