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

export const ensurePatternFormat = (patternList: string[]): string[] =>
  [
    ...new Set(
      patternList.reduce((acc: string[], pattern: string) => [...pattern.split(','), ...acc], [])
    ),
  ].sort();

export const validateSelectedPatterns = (
  state: SourcererModel,
  payload: SelectedDataViewPayload,
  shouldValidateSelectedPatterns: boolean
): Partial<SourcererScopeById> => {
  const { id, ...rest } = payload;
  const dataView = state.kibanaDataViews.find((p) => p.id === rest.selectedDataViewId);
  // dedupe because these could come from a silly url or pre 8.0 timeline
  const dedupePatterns = ensurePatternFormat(rest.selectedPatterns);
  let missingPatterns: string[] = [];
  // check for missing patterns against default data view only
  if (dataView == null || dataView.id === state.defaultDataView.id) {
    const dedupeAllDefaultPatterns = ensurePatternFormat(
      (dataView ?? state.defaultDataView).title.split(',')
    );
    missingPatterns = dedupePatterns.filter(
      (pattern) => !dedupeAllDefaultPatterns.includes(pattern)
    );
  }
  const selectedPatterns =
    // shouldValidateSelectedPatterns is false when upgrading from
    // legacy pre-8.0 timeline index patterns to data view.
    shouldValidateSelectedPatterns && dataView != null && missingPatterns.length === 0
      ? dedupePatterns.filter(
          (pattern) =>
            (dataView != null && dataView.patternList.includes(pattern)) ||
            // this is a hack, but sometimes signal index is deleted and is getting regenerated. it gets set before it is put in the dataView
            state.signalIndexName == null ||
            state.signalIndexName === pattern
        )
      : // don't remove non-existing patterns, they were saved in the first place in timeline
        // but removed from the security data view
        // or its a legacy pre-8.0 timeline
        dedupePatterns;

  return {
    [id]: {
      ...state.sourcererScopes[id],
      ...rest,
      selectedDataViewId: dataView?.id ?? null,
      selectedPatterns,
      missingPatterns,
      // if in timeline, allow for empty in case pattern was deleted
      // need flow for this
      ...(isEmpty(selectedPatterns) && id !== SourcererScopeName.timeline
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
  patternList: sourcererModel.SourcererDataView['patternList'];
  scopeId: sourcererModel.SourcererScopeName;
  signalIndexName: string | null;
}
export const checkIfIndicesExist = ({
  patternList,
  scopeId,
  signalIndexName,
}: CheckIfIndicesExistParams) =>
  scopeId === SourcererScopeName.detections
    ? patternList.includes(`${signalIndexName}`)
    : scopeId === SourcererScopeName.default
    ? patternList.filter((i) => i !== signalIndexName).length > 0
    : patternList.length > 0;
