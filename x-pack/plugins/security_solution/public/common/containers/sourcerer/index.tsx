/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import deepEqual from 'fast-deep-equal';
import isEqual from 'lodash/isEqual';
import { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { DEFAULT_INDEX_KEY } from '../../../../common/constants';
import { useUiSetting$ } from '../../lib/kibana';

import { sourcererActions, sourcererSelectors } from '../../store/sourcerer';
import { KibanaIndexPatterns, ManageScope, SourcererScopeName } from '../../store/sourcerer/model';
import { useIndexFields } from '../source';
import { State } from '../../store';
import { useUserInfo } from '../../../detections/components/user_info';

export const dedupeIndexName = (kibanaIndex: string[], configIndex: string[]) => {
  return [
    ...configIndex.filter((ci) =>
      kibanaIndex.reduce<boolean>((acc, kip) => {
        if (kip.includes(ci) || ci.includes(kip)) {
          return false;
        }
        return acc;
      }, true)
    ),
    ...kibanaIndex,
  ];
};

export const useInitSourcerer = (scopeId: SourcererScopeName = SourcererScopeName.default) => {
  const dispatch = useDispatch();

  const { loading: loadingSignalIndex, isSignalIndexExists, signalIndexName } = useUserInfo();
  const [configIndex] = useUiSetting$<string[]>(DEFAULT_INDEX_KEY);
  const getKibanaIndexPatternsSelector = useMemo(
    () => sourcererSelectors.kibanaIndexPatternsSelector(),
    []
  );
  const kibanaIndexPatterns = useSelector(getKibanaIndexPatternsSelector, isEqual);

  useIndexFields(scopeId);

  const setIndexPatternsList = useCallback(
    (kibanaIndexPatternsToPersist: KibanaIndexPatterns, allIndexPatternsToPersist: string[]) => {
      dispatch(
        sourcererActions.setIndexPatternsList({
          kibanaIndexPatterns: kibanaIndexPatternsToPersist,
          allIndexPatterns: allIndexPatternsToPersist,
        })
      );
    },
    [dispatch]
  );

  const allIndexPatterns = useMemo(
    () =>
      dedupeIndexName(
        kibanaIndexPatterns.map((kip) => kip.title),
        configIndex
      ),
    [kibanaIndexPatterns, configIndex]
  );

  useEffect(() => {
    if (!loadingSignalIndex && signalIndexName != null) {
      dispatch(sourcererActions.setSignalIndexName({ signalIndexName }));
    }
  }, [dispatch, loadingSignalIndex, signalIndexName]);

  // Related to the detection page
  useEffect(() => {
    if (
      scopeId === SourcererScopeName.detections &&
      isSignalIndexExists &&
      signalIndexName != null
    ) {
      dispatch(
        sourcererActions.setSelectedIndexPatterns({
          id: scopeId,
          selectedPatterns: [signalIndexName],
        })
      );
      setIndexPatternsList(kibanaIndexPatterns, allIndexPatterns);
    }
  }, [
    allIndexPatterns,
    dispatch,
    kibanaIndexPatterns,
    isSignalIndexExists,
    scopeId,
    setIndexPatternsList,
    signalIndexName,
  ]);

  useEffect(() => {
    if (scopeId !== SourcererScopeName.detections) {
      setIndexPatternsList(kibanaIndexPatterns, allIndexPatterns);
    }
  }, [allIndexPatterns, kibanaIndexPatterns, scopeId, setIndexPatternsList]);
};

export const useSourcererScope = (scope: SourcererScopeName = SourcererScopeName.default) => {
  const sourcererScopeSelector = useMemo(() => sourcererSelectors.getSourcererScopeSelector(), []);
  const SourcererScope = useSelector<State, ManageScope>(
    (state) => sourcererScopeSelector(state, scope),
    deepEqual
  );
  return SourcererScope;
};
