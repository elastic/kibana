/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import type { EuiComboBoxOptionOption, EuiSuperSelectOption } from '@elastic/eui';
import { useDispatch } from 'react-redux';

import { getScopePatternListSelection } from '../store/helpers';
import { sourcererActions, sourcererModel } from '../store';
import { getDataViewSelectOptions, getPatternListWithoutSignals } from './helpers';
import { SourcererScopeName } from '../store/model';
import { sortWithExcludesAtEnd } from '../../../common/utils/sourcerer';
import { useKibana } from '../../common/lib/kibana';
import { getSourcererDataView } from '../containers/get_sourcerer_data_view';

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
  loadingIndexPatterns: boolean;
  handleOutsideClick: () => void;
  isModified: ModifiedTypes;
  onChangeCombo: (newSelectedDataViewId: Array<EuiComboBoxOptionOption<string>>) => void;
  renderOption: ({ value }: EuiComboBoxOptionOption<string>) => React.ReactElement;
  selectedOptions: Array<EuiComboBoxOptionOption<string>>;
  setIndexPatternsByDataView: (newSelectedDataViewId: string, isAlerts?: boolean) => void;
}

const patternListToOptions = (patternList: string[], selectablePatterns?: string[]) =>
  sortWithExcludesAtEnd(patternList).map((s) => ({
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
  const dispatch = useDispatch();
  const {
    data: { dataViews },
  } = useKibana().services;
  const isHookAlive = useRef(true);
  const [loadingIndexPatterns, setLoadingIndexPatterns] = useState(false);
  // anything that uses patternListToOptions should be memoized, as it always returns a new array
  // TODO: fix that
  const signalPatternListToOptions = useMemo(() => {
    return signalIndexName ? patternListToOptions([signalIndexName]) : [];
  }, [signalIndexName]);
  const selectedPatternsAsOptions = useMemo(() => {
    return patternListToOptions(selectedPatterns);
  }, [selectedPatterns]);
  const [selectedOptions, setSelectedOptions] = useState<Array<EuiComboBoxOptionOption<string>>>(
    isOnlyDetectionAlerts ? signalPatternListToOptions : selectedPatternsAsOptions
  );
  const [isModified, setIsModified] = useState<ModifiedTypes>(
    dataViewId == null ? 'deprecated' : missingPatterns.length > 0 ? 'missingPatterns' : ''
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

  const getDefaultSelectedOptionsByDataView = useCallback(
    (id: string, isAlerts: boolean = false): Array<EuiComboBoxOptionOption<string>> =>
      scopeId === SourcererScopeName.detections || isAlerts
        ? signalPatternListToOptions
        : patternListToOptions(
            getScopePatternListSelection(
              kibanaDataViews.find((dataView) => dataView.id === id),
              scopeId,
              signalIndexName,
              id === defaultDataViewId
            )
          ),
    [signalPatternListToOptions, kibanaDataViews, scopeId, signalIndexName, defaultDataViewId]
  );

  const defaultSelectedPatternsAsOptions = useMemo(
    () => (dataViewId != null ? getDefaultSelectedOptionsByDataView(dataViewId) : []),
    [dataViewId, getDefaultSelectedOptionsByDataView]
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
        ? signalPatternListToOptions
        : selectedPatternsAsOptions
    );
  }, [selectedPatterns, scopeId, selectedPatternsAsOptions, signalPatternListToOptions]);
  // when scope updates, check modified to set/remove alerts label
  useEffect(() => {
    onSetIsModified(
      selectedPatterns.map((pattern) => pattern),
      selectedDataViewId
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnlyDetectionAlerts, selectedDataViewId, missingPatterns, scopeId, selectedPatterns]);

  const onChangeCombo = useCallback((newSelectedOptions) => {
    setSelectedOptions(newSelectedOptions);
  }, []);

  const renderOption = useCallback(
    ({ value }) => <span data-test-subj="sourcerer-combo-option">{value}</span>,
    []
  );

  const setIndexPatternsByDataView = useCallback(
    async (newSelectedDataViewId: string, isAlerts?: boolean) => {
      if (
        kibanaDataViews.some(
          (kdv) => kdv.id === newSelectedDataViewId && Object.keys(kdv?.fields || {}).length === 0
        )
      ) {
        try {
          setLoadingIndexPatterns(true);
          setSelectedOptions([]);
          const dataView = await getSourcererDataView(newSelectedDataViewId, dataViews);

          if (isHookAlive.current) {
            dispatch(sourcererActions.setDataView(dataView));
            setSelectedOptions(
              isOnlyDetectionAlerts
                ? signalPatternListToOptions
                : patternListToOptions(dataView.patternList)
            );
          }
        } catch (err) {
          // Nothing to do
        }
        setLoadingIndexPatterns(false);
      } else {
        setSelectedOptions(getDefaultSelectedOptionsByDataView(newSelectedDataViewId, isAlerts));
      }
    },
    [
      signalPatternListToOptions,
      dispatch,
      getDefaultSelectedOptionsByDataView,
      isOnlyDetectionAlerts,
      kibanaDataViews,
      dataViews,
    ]
  );

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

  useEffect(() => {
    isHookAlive.current = true;
    return () => {
      isHookAlive.current = false;
    };
  }, []);

  const handleOutsideClick = useCallback(() => {
    setSelectedOptions(selectedPatternsAsOptions);
  }, [selectedPatternsAsOptions]);

  return {
    allOptions,
    dataViewSelectOptions,
    loadingIndexPatterns,
    handleOutsideClick,
    isModified,
    onChangeCombo,
    renderOption,
    selectedOptions,
    setIndexPatternsByDataView,
  };
};
