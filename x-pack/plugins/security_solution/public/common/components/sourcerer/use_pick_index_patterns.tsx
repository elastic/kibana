/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiComboBoxOptionOption } from '@elastic/eui';
import { getScopePatternListSelection } from '../../store/sourcerer/helpers';
import { sourcererModel } from '../../store/sourcerer';
import { getPatternListWithoutSignals } from './helpers';
import { SourcererScopeName } from '../../store/sourcerer/model';

interface UsePickIndexPatternsProps {
  dataViewId: string;
  defaultDataViewId: string;
  isOnlyDetectionAlerts: boolean;
  kibanaDataViews: sourcererModel.SourcererModel['kibanaDataViews'];
  scopeId: sourcererModel.SourcererScopeName;
  selectedPatterns: string[];
  signalIndexName: string | null;
}

export type ModifiedTypes = 'modified' | 'alerts' | '';

interface UsePickIndexPatterns {
  isModified: ModifiedTypes;
  onChangeCombo: (newSelectedDataViewId: Array<EuiComboBoxOptionOption<string>>) => void;
  renderOption: ({ value }: EuiComboBoxOptionOption<string>) => React.ReactElement;
  selectableOptions: Array<EuiComboBoxOptionOption<string>>;
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
  scopeId,
  selectedPatterns,
  signalIndexName,
}: UsePickIndexPatternsProps): UsePickIndexPatterns => {
  const alertsOptions = useMemo(
    () => (signalIndexName ? patternListToOptions([signalIndexName]) : []),
    [signalIndexName]
  );

  const { patternList, selectablePatterns } = useMemo(() => {
    if (isOnlyDetectionAlerts && signalIndexName) {
      return {
        patternList: [signalIndexName],
        selectablePatterns: [signalIndexName],
      };
    }
    const theDataView = kibanaDataViews.find((dataView) => dataView.id === dataViewId);
    return theDataView != null
      ? scopeId === sourcererModel.SourcererScopeName.default
        ? {
            patternList: getPatternListWithoutSignals(
              theDataView.title
                .split(',')
                // remove duplicates patterns from selector
                .filter((pattern, i, self) => self.indexOf(pattern) === i),
              signalIndexName
            ),
            selectablePatterns: getPatternListWithoutSignals(
              theDataView.patternList,
              signalIndexName
            ),
          }
        : {
            patternList: theDataView.title
              .split(',')
              // remove duplicates patterns from selector
              .filter((pattern, i, self) => self.indexOf(pattern) === i),
            selectablePatterns: theDataView.patternList,
          }
      : { patternList: [], selectablePatterns: [] };
  }, [dataViewId, isOnlyDetectionAlerts, kibanaDataViews, scopeId, signalIndexName]);

  const selectableOptions = useMemo(
    () => patternListToOptions(patternList, selectablePatterns),
    [patternList, selectablePatterns]
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
    () => getDefaultSelectedOptionsByDataView(dataViewId),
    [dataViewId, getDefaultSelectedOptionsByDataView]
  );

  const [isModified, setIsModified] = useState<'modified' | 'alerts' | ''>('');
  const onSetIsModified = useCallback(
    (patterns?: string[]) => {
      if (isOnlyDetectionAlerts) {
        return setIsModified('alerts');
      }
      const modifiedPatterns = patterns != null ? patterns : selectedPatterns;
      const isPatternsModified =
        defaultSelectedPatternsAsOptions.length !== modifiedPatterns.length ||
        !defaultSelectedPatternsAsOptions.every((option) =>
          modifiedPatterns.find((pattern) => option.value === pattern)
        );
      return setIsModified(isPatternsModified ? 'modified' : '');
    },
    [defaultSelectedPatternsAsOptions, isOnlyDetectionAlerts, selectedPatterns]
  );

  // when scope updates, check modified to set/remove alerts label
  useEffect(() => {
    setSelectedOptions(
      scopeId === SourcererScopeName.detections
        ? alertsOptions
        : patternListToOptions(selectedPatterns)
    );
    onSetIsModified(selectedPatterns);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeId, selectedPatterns]);

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

  return {
    isModified,
    onChangeCombo,
    renderOption,
    selectableOptions,
    selectedOptions,
    setIndexPatternsByDataView,
  };
};
