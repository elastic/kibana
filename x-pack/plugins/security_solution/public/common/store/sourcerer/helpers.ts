/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { SourcererDataView, SourcererModel, SourcererScopeById, SourcererScopeName } from './model';
import { SelectedDataViewPayload } from './actions';

export const getScopePatternListSelection = (
  theDataView: SourcererDataView | undefined,
  sourcererScope: SourcererScopeName,
  signalIndexName: SourcererModel['signalIndexName'],
  isDefaultDataView: boolean
): string[] => {
  const patternList: string[] =
    theDataView != null && theDataView.id !== null ? theDataView.patternList : [];

  if (!isDefaultDataView) {
    return patternList.sort();
  }
  // when our SIEM data view is set, here are the defaults
  switch (sourcererScope) {
    case SourcererScopeName.default:
      return patternList.filter((index) => index !== signalIndexName).sort();
    case SourcererScopeName.detections:
      // set to signalIndexName whether or not it exists yet in the patternList
      return (signalIndexName != null ? [signalIndexName] : []).sort();
    case SourcererScopeName.timeline:
      return patternList.sort();
  }
};

export const ensurePatternFormat = (patternList: string[]): string[] =>
  [
    ...new Set(
      patternList.reduce((acc: string[], pattern: string) => [...pattern.split(','), ...acc], [])
    ),
  ].sort();

export const validateSelectedPatterns = (
  state: SourcererModel,
  payload: SelectedDataViewPayload
): Partial<SourcererScopeById> => {
  const { id, ...rest } = payload;
  const dataView = state.kibanaDataViews.find((p) => p.id === rest.selectedDataViewId);
  // dedupe because these could come from a silly url or pre 8.0 timeline
  const dedupePatterns = ensurePatternFormat(rest.selectedPatterns);
  const selectedPatterns =
    dataView != null
      ? dedupePatterns.filter(
          (pattern) =>
            // Typescript is being mean and telling me dataView could be undefined here
            // so redoing the dataView != null check
            (dataView != null && dataView.patternList.includes(pattern)) ||
            // this is a hack, but sometimes signal index is deleted and is getting regenerated. it gets set before it is put in the dataView
            state.signalIndexName == null ||
            state.signalIndexName === pattern
        )
      : // 7.16 -> 8.0 this will get hit because dataView == null
        dedupePatterns;

  return {
    [id]: {
      ...state.sourcererScopes[id],
      ...rest,
      selectedDataViewId: dataView?.id ?? null,
      selectedPatterns,
      ...(isEmpty(selectedPatterns)
        ? {
            selectedPatterns: getScopePatternListSelection(
              dataView ?? state.defaultDataView,
              id,
              state.signalIndexName,
              (dataView ?? state.defaultDataView).id === state.defaultDataView.id
            ),
          }
        : {}),
      loading: false,
    },
  };
};

export const getSelectedPatterns = (
  state: SourcererModel,
  payload: SelectedDataViewPayload
): Partial<SourcererScopeById> => {
  const { id, ...rest } = payload;

  const dataView = state.kibanaDataViews.find((p) => p.id === rest.selectedDataViewId);
  // dedupe because these could come from a silly url or pre 8.0 timeline
  const dedupePatterns = ensurePatternFormat(rest.selectedPatterns);

  const selectedPatterns =
    dataView != null
      ? dedupePatterns.filter(
          (pattern) =>
            // Typescript is being mean and telling me dataView could be undefined here
            // so redoing the dataView != null check
            (dataView != null && dataView.patternList.includes(pattern)) ||
            // this is a hack, but sometimes signal index is deleted and is getting regenerated. it gets set before it is put in the dataView
            state.signalIndexName == null ||
            state.signalIndexName === pattern
        )
      : // 7.16 -> 8.0 this will get hit because dataView == null
        dedupePatterns;
  const missingPatterns = dedupePatterns.filter(
    (pattern) => state?.defaultDataView?.title.indexOf(pattern) === -1
  );
  const newSelectedPatterns = [...selectedPatterns, ...missingPatterns];
  return {
    [id]: {
      ...state.sourcererScopes[id],
      ...rest,
      selectedDataViewId: dataView?.id ?? null,
      selectedPatterns: newSelectedPatterns,
      ...(isEmpty(newSelectedPatterns)
        ? {
            selectedPatterns: getScopePatternListSelection(
              dataView ?? state.defaultDataView,
              id,
              state.signalIndexName,
              (dataView ?? state.defaultDataView).id === state.defaultDataView.id
            ),
          }
        : {}),
      loading: false,
    },
  };
};
