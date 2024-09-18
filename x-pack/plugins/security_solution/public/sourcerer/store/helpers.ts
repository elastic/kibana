/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import type { SourcererDataView, SourcererModel, SourcererScopeById } from './model';
import type { sourcererModel } from '.';
import { SourcererScopeName } from './model';
import type { SelectedDataViewPayload } from './actions';
import { ensurePatternFormat, sortWithExcludesAtEnd } from '../../../common/utils/sourcerer';

const getPatternListFromScope = (
  scope: SourcererScopeName,
  patternList: string[],
  signalIndexName: string | null
) => {
  // when our SIEM data view is set, here are the defaults
  switch (scope) {
    case SourcererScopeName.default:
      return sortWithExcludesAtEnd(patternList.filter((index) => index !== signalIndexName));
    case SourcererScopeName.detections:
      // set to signalIndexName whether or not it exists yet in the patternList
      return signalIndexName != null ? [signalIndexName] : [];
    case SourcererScopeName.timeline:
      return sortWithExcludesAtEnd(patternList);
    case SourcererScopeName.analyzer:
      return sortWithExcludesAtEnd(patternList);
  }
};

export const getScopePatternListSelection = (
  theDataView: SourcererDataView | undefined,
  sourcererScope: SourcererScopeName,
  signalIndexName: SourcererModel['signalIndexName'],
  isDefaultDataView: boolean
): string[] => {
  const patternList: string[] =
    theDataView != null && theDataView.id !== null ? theDataView.patternList : [];

  if (!isDefaultDataView) {
    return sortWithExcludesAtEnd(patternList);
  }

  return getPatternListFromScope(sourcererScope, patternList, signalIndexName);
};

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
  let selectedPatterns =
    // shouldValidateSelectedPatterns is false when upgrading from
    // legacy pre-8.0 timeline index patterns to data view.
    shouldValidateSelectedPatterns &&
    dataView != null &&
    missingPatterns.length === 0 &&
    // don't validate when the data view has not been initialized (default is initialized already always)
    dataView.id !== state.defaultDataView.id &&
    dataView.patternList.length > 0
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
  const signalIndexName = state.signalIndexName;
  selectedPatterns = getPatternListFromScope(id, selectedPatterns, signalIndexName);

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
  isDefaultDataViewSelected: boolean;
}

export const checkIfIndicesExist = ({
  patternList,
  scopeId,
  signalIndexName,
  isDefaultDataViewSelected,
}: CheckIfIndicesExistParams) => {
  if (scopeId === SourcererScopeName.detections) {
    return patternList.includes(`${signalIndexName}`);
  }

  if (scopeId === SourcererScopeName.default) {
    if (isDefaultDataViewSelected) {
      return patternList.filter((i) => i !== signalIndexName).length > 0;
    }

    return patternList.length > 0;
  }

  return patternList.length > 0;
};
