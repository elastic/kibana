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
  dataViewId: string | null;
  defaultDataViewId: string;
  isOnlyDetectionAlerts: boolean;
  kibanaDataViews: sourcererModel.SourcererModel['kibanaDataViews'];
  scopeId: sourcererModel.SourcererScopeName;
  selectedPatterns: string[];
  signalIndexName: string | null;
}

export type ModifiedTypes = 'modified' | 'alerts' | 'deprecated' | '';

interface UsePickIndexPatterns {
  isModified: ModifiedTypes;
  missingPatterns: string[];
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
  // const { patternList, selectablePatterns, missingPatterns } = useMemo(() => {
  //   if (isOnlyDetectionAlerts && signalIndexName) {
  //     return {
  //       missingPatterns: [],
  //       patternList: [signalIndexName],
  //       selectablePatterns: [signalIndexName],
  //     };
  //   }
  //   const theDataView = kibanaDataViews.find((dataView) => dataView.id === dataViewId);
  //   if (theDataView == null) {
  //     return { missingPatterns: [], patternList: [], selectablePatterns: [] };
  //   }
  //
  //   const titleAsList = [...new Set(theDataView.title.split(','))];
  //   console.log('here we go', {
  //     selectedPatterns,
  //     missingPatterns: selectedPatterns.filter((pattern) => !titleAsList.includes(pattern)),
  //     patternList: titleAsList,
  //     selectablePatterns: theDataView.patternList,
  //     dataViewId,
  //   });
  //   return scopeId === sourcererModel.SourcererScopeName.default
  //     ? {
  //         missingPatterns: [],
  //         patternList: getPatternListWithoutSignals(titleAsList, signalIndexName),
  //         selectablePatterns: getPatternListWithoutSignals(
  //           theDataView.patternList,
  //           signalIndexName
  //         ),
  //       }
  //     : {
  //         missingPatterns: selectedPatterns.filter((pattern) => !titleAsList.includes(pattern)),
  //         patternList: titleAsList,
  //         selectablePatterns: theDataView.patternList,
  //       };
  // }, [
  //   dataViewId,
  //   isOnlyDetectionAlerts,
  //   kibanaDataViews,
  //   scopeId,
  //   selectedPatterns,
  //   signalIndexName,
  // ]);
  const [{ missingPatterns, patternList, selectablePatterns }, setPatterns] = useState<{
    missingPatterns: string[];
    patternList: string[];
    selectablePatterns: string[];
  }>({
    missingPatterns: [],
    patternList: [],
    selectablePatterns: [],
  });

  const onSetPatterns = useCallback(() => {
    if (isOnlyDetectionAlerts && signalIndexName) {
      return setPatterns({
        missingPatterns: [],
        patternList: [signalIndexName],
        selectablePatterns: [signalIndexName],
      });
    }
    const theDataView = kibanaDataViews.find((dataView) => dataView.id === dataViewId);

    if (theDataView == null) {
      const defaultDataView = kibanaDataViews.find((dataView) => dataView.id === defaultDataViewId);
      const titleAsList = [...new Set((defaultDataView ?? { title: '' }).title.split(','))];
      return setPatterns({
        missingPatterns: selectedPatterns.filter((pattern) => !titleAsList.includes(pattern)),
        patternList: [],
        selectablePatterns: [],
      });
    }

    const titleAsList = [...new Set(theDataView.title.split(','))];
    console.log('here we go', {
      selectedPatterns,
      missingPatterns: selectedPatterns.filter((pattern) => !titleAsList.includes(pattern)),
      patternList: titleAsList,
      selectablePatterns: theDataView.patternList,
      dataViewId,
    });
    return scopeId === sourcererModel.SourcererScopeName.default
      ? setPatterns({
          missingPatterns: [],
          patternList: getPatternListWithoutSignals(titleAsList, signalIndexName),
          selectablePatterns: getPatternListWithoutSignals(
            theDataView.patternList,
            signalIndexName
          ),
        })
      : setPatterns({
          missingPatterns: selectedPatterns.filter((pattern) => !titleAsList.includes(pattern)),
          patternList: titleAsList,
          selectablePatterns: theDataView.patternList,
        });
  }, [
    dataViewId,
    defaultDataViewId,
    isOnlyDetectionAlerts,
    kibanaDataViews,
    scopeId,
    selectedPatterns,
    signalIndexName,
  ]);

  useEffect(() => {
    console.log('useEffect dataViewId', dataViewId);
    onSetPatterns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataViewId]);

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
    () => (dataViewId != null ? getDefaultSelectedOptionsByDataView(dataViewId) : []),
    [dataViewId, getDefaultSelectedOptionsByDataView]
  );

  const [isModified, setIsModified] = useState<ModifiedTypes>(
    dataViewId == null ? 'deprecated' : ''
  );
  const onSetIsModified = useCallback(
    (patterns: string[], id: string | null) => {
      if (id == null) {
        return setIsModified('deprecated');
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
    [defaultSelectedPatternsAsOptions, isOnlyDetectionAlerts]
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
      selectedOptions.map(({ label }) => label),
      dataViewId
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataViewId, scopeId, selectedOptions]);

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
    missingPatterns,
    onChangeCombo,
    renderOption,
    selectableOptions,
    selectedOptions,
    setIndexPatternsByDataView,
  };
};
