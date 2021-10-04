/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { KibanaDataView, SourcererModel, SourcererScopeById, SourcererScopeName } from './model';
import { TimelineEventsType } from '../../../../common';
import { DEFAULT_DATA_VIEW_ID } from '../../../../common/constants';
import { SelectedDataViewPayload } from './actions';

export interface Args {
  eventType?: TimelineEventsType;
  id: SourcererScopeName;
  selectedPatterns: string[];
  state: SourcererModel;
}

export const isSignalIndex = (index: string, signalIndex: string | null): boolean => {
  const first = index.split('-*');
  const second = `${signalIndex}`.split('-*');
  if (first.length > 2 || second.length > 2) {
    return false;
  }
  return first[0] === second[0];
};

export const getScopePatternListSelection = (
  theDataView: KibanaDataView | undefined,
  sourcererScope: SourcererScopeName,
  signalIndexName: SourcererModel['signalIndexName']
): string[] => {
  let patternList: string[] =
    theDataView != null && theDataView.id !== null ? theDataView.patternList : [];

  // when our SIEM DATA_VIEW is set, here are the defaults
  if (theDataView && theDataView.id === DEFAULT_DATA_VIEW_ID) {
    if (sourcererScope === SourcererScopeName.default) {
      patternList = patternList.filter((index) => !isSignalIndex(index, signalIndexName));
    } else if (sourcererScope === SourcererScopeName.detections) {
      // set to signalIndexName whether or not it exists yet in the patternList
      patternList = signalIndexName != null ? [signalIndexName] : [];
    } else if (sourcererScope === SourcererScopeName.timeline) {
      patternList =
        signalIndexName != null
          ? [
              // remove signalIndexName in case its already in there and add it whether or not it exists yet in the patternList
              ...patternList.filter((index) => !isSignalIndex(index, signalIndexName)),
              signalIndexName,
            ]
          : patternList;
    }
  }
  return patternList.sort();
};

export const validateSelectedPatterns = (
  state: SourcererModel,
  payload: SelectedDataViewPayload
): Partial<SourcererScopeById> => {
  const { id, eventType, ...rest } = payload;
  const dataView = state.kibanaDataViews.find((p) => p.id === rest.selectedDataViewId);
  const selectedPatterns =
    rest.selectedPatterns != null && dataView != null
      ? rest.selectedPatterns.filter(
          // ensures all selected patterns are selectable
          // and no patterns are duplicated
          (value, index, self) =>
            (self.indexOf(value) === index &&
              // indexOf instead of === because the dataView version of signals index
              // will have a wildcard and the signalIndexName does not include the wildcard
              dataView.patternList.some((v) => v.indexOf(value) > -1)) ||
            state.signalIndexName == null // this is a bad hack, but sometimes signal index is deleted and is getting regenerated. it gets set before it is put in the dataView
        )
      : [];

  return {
    [id]: {
      ...state.sourcererScopes[id],
      ...rest,
      selectedPatterns,
      ...((isEmpty(selectedPatterns) || dataView == null) &&
      dataView != null &&
      // if there is an error in the data view, dont set defaults
      dataView.id !== null
        ? id === SourcererScopeName.timeline
          ? defaultDataViewByEventType({ state, eventType })
          : { selectedPatterns: getScopePatternListSelection(dataView, id, state.signalIndexName) }
        : {}),
      loading: false,
    },
  };
};

// TODO: Steph/sourcerer eventType will be alerts only, when ui updates delete raw
export const defaultDataViewByEventType = ({
  state,
  eventType,
}: {
  state: SourcererModel;
  eventType?: TimelineEventsType;
}) => {
  const {
    signalIndexName,
    defaultDataView: { id, patternList },
  } = state;
  if (signalIndexName != null && (eventType === 'signal' || eventType === 'alert')) {
    return {
      selectedPatterns: [signalIndexName],
      selectedDataViewId: id,
    };
  } else if (eventType === 'raw') {
    return {
      selectedPatterns: patternList
        .filter((index) => !isSignalIndex(index, signalIndexName))
        .sort(),
      selectedDataViewId: id,
    };
  }
  return { selectedPatterns: patternList.sort(), selectedDataViewId: id };
};
