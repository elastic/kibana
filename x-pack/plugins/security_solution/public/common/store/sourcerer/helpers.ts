/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { SourcererDataView, SourcererModel, SourcererScopeById, SourcererScopeName } from './model';
import { SelectedDataViewPayload } from './actions';
import { sourcererModel } from '../model';

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

export const validateSelectedPatterns = (
  state: SourcererModel,
  payload: SelectedDataViewPayload
): Partial<SourcererScopeById> => {
  const { id, ...rest } = payload;
  let dataView = state.kibanaDataViews.find((p) => p.id === rest.selectedDataViewId);
  // dedupe because these could come from a silly url or pre 8.0 timeline
  const dedupePatterns = [...new Set(rest.selectedPatterns)];
  let selectedPatterns =
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

  if (selectedPatterns.length > 0 && dataView == null) {
    // we have index patterns, but not a data view id
    // find out if we have these index patterns in the defaultDataView
    const areAllPatternsInDefault = selectedPatterns.every(
      (pattern) => state.defaultDataView.title.indexOf(pattern) > -1
    );
    if (areAllPatternsInDefault) {
      dataView = state.defaultDataView;
      selectedPatterns = selectedPatterns.filter(
        (pattern) => dataView != null && dataView.patternList.includes(pattern)
      );
    }
  }
  // TO DO: Steph/sourcerer If dataView is still undefined here, create temporary dataView
  // and prompt user to go create this dataView
  // currently UI will take the undefined dataView and default to defaultDataView anyways
  // this is a "strategically merged" bug ;)
  // https://github.com/elastic/security-team/issues/1921

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

interface CheckIfIndicesExistParams {
  scopeId: sourcererModel.SourcererScopeName;
  signalIndexName: string | null;
  sourcererDataView: sourcererModel.SourcererDataView;
}
export const checkIfIndicesExist = ({
  scopeId,
  signalIndexName,
  sourcererDataView,
}: CheckIfIndicesExistParams) =>
  scopeId === SourcererScopeName.detections
    ? sourcererDataView.patternList.includes(`${signalIndexName}`)
    : scopeId === SourcererScopeName.default
    ? sourcererDataView.patternList.filter((i) => i !== signalIndexName).length > 0
    : sourcererDataView.patternList.length > 0;
