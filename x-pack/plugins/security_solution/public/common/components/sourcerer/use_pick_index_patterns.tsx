/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { EuiComboBoxOptionOption } from '@elastic/eui';
import { getScopePatternListSelection } from '../../store/sourcerer/helpers';
import { sourcererModel } from '../../store/sourcerer';

interface UsePickIndexPatternsProps {
  alertsOptions: Array<EuiComboBoxOptionOption<string>>;
  dataViewId: string;
  isOnlyDetectionAlerts: boolean;
  kibanaDataViews: sourcererModel.KibanaDataView[];
  scopeId: sourcererModel.SourcererScopeName;
  selectedPatterns: string[];
  signalIndexName: string | null;
}
interface UsePickIndexPatterns {
  isModified: boolean;
  onChangeCombo: (newSelectedDataViewId: Array<EuiComboBoxOptionOption<string>>) => void;
  renderOption: ({ value }: EuiComboBoxOptionOption<string>) => React.ReactElement;
  selectableOptions: Array<EuiComboBoxOptionOption<string>>;
  selectedOptions: Array<EuiComboBoxOptionOption<string>>;
  setIndexPatternsByDataView: (newSelectedDataViewId: string) => void;
}

export const usePickIndexPatterns = ({
  alertsOptions,
  dataViewId,
  isOnlyDetectionAlerts,
  kibanaDataViews,
  scopeId,
  selectedPatterns,
  signalIndexName,
}: UsePickIndexPatternsProps): UsePickIndexPatterns => {
  const { patternList, selectablePatterns } = useMemo(() => {
    if (isOnlyDetectionAlerts && signalIndexName) {
      return {
        patternList: [signalIndexName],
        selectablePatterns: [signalIndexName],
      };
    }
    const theDataView = kibanaDataViews.find((dataView) => dataView.id === dataViewId);
    return theDataView != null
      ? {
          patternList: theDataView.title
            .split(',')
            // remove duplicates patterns from selector
            .filter((pattern, i, self) => self.indexOf(pattern) === i),
          selectablePatterns: theDataView.patternList,
        }
      : { patternList: [], selectablePatterns: [] };
  }, [isOnlyDetectionAlerts, kibanaDataViews, signalIndexName, dataViewId]);

  const selectableOptions = useMemo(
    () =>
      patternList.map((indexName) => ({
        label: indexName,
        value: indexName,
        disabled: !selectablePatterns.includes(indexName),
      })),
    [patternList, selectablePatterns]
  );
  const [selectedOptions, setSelectedOptions] = useState<Array<EuiComboBoxOptionOption<string>>>(
    isOnlyDetectionAlerts
      ? alertsOptions
      : selectedPatterns.map((indexName) => ({
          label: indexName,
          value: indexName,
        }))
  );

  const getDefaultSelectedOptionsByDataView = useCallback(
    (id: string): Array<EuiComboBoxOptionOption<string>> =>
      isOnlyDetectionAlerts
        ? alertsOptions
        : getScopePatternListSelection(
            kibanaDataViews.find((dataView) => dataView.id === id),
            scopeId,
            signalIndexName
          ).map((indexSelected: string) => ({
            label: indexSelected,
            value: indexSelected,
          })),
    [alertsOptions, isOnlyDetectionAlerts, kibanaDataViews, scopeId, signalIndexName]
  );

  const defaultSelectedOptions = useMemo(
    () => getDefaultSelectedOptionsByDataView(dataViewId),
    [dataViewId, getDefaultSelectedOptionsByDataView]
  );

  const isModified = useMemo(
    () =>
      defaultSelectedOptions.length !== selectedOptions.length ||
      !defaultSelectedOptions.every((option) =>
        selectedOptions.find((selectedOption) => option.value === selectedOption.value)
      ),
    [defaultSelectedOptions, selectedOptions]
  );

  const onChangeCombo = useCallback((newSelectedOptions) => {
    setSelectedOptions(newSelectedOptions);
  }, []);

  const renderOption = useCallback(
    ({ value }) => <span data-test-subj="sourcerer-combo-option">{value}</span>,
    []
  );

  const setIndexPatternsByDataView = (newSelectedDataViewId: string) => {
    setSelectedOptions(getDefaultSelectedOptionsByDataView(newSelectedDataViewId));
  };

  useEffect(() => {
    setSelectedOptions(
      isOnlyDetectionAlerts
        ? alertsOptions
        : selectedPatterns.map((indexName) => ({
            label: indexName,
            value: indexName,
          }))
    );
  }, [alertsOptions, isOnlyDetectionAlerts, selectedPatterns]);

  return {
    isModified,
    onChangeCombo,
    renderOption,
    selectableOptions,
    selectedOptions,
    setIndexPatternsByDataView,
  };
};
