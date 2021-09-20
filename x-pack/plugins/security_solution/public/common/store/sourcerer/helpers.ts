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

export const getScopePatternListSelection = (
  theDataView: KibanaDataView | undefined,
  sourcererScope: SourcererScopeName,
  signalIndexName: SourcererModel['signalIndexName']
): string[] => {
  let patternList: string[] = theDataView != null ? theDataView.patternList : [];

  // when our SIEM DATA_VIEW is set, here are the defaults
  if (theDataView && theDataView.id === DEFAULT_DATA_VIEW_ID) {
    if (sourcererScope === SourcererScopeName.default) {
      patternList = patternList.filter((index) => index !== signalIndexName).sort();
    } else if (sourcererScope === SourcererScopeName.detections) {
      patternList = patternList.filter((index) => index === signalIndexName);
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
  // TODO: Steph/sourcerer needs unit tests
  const selectedPatterns =
    rest.selectedPatterns != null && dataView != null
      ? rest.selectedPatterns.filter(
          // ensures all selected patterns are selectable
          // and no patterns are duplicated
          (value, index, self) =>
            self.indexOf(value) === index && dataView.patternList.includes(value)
        )
      : [];
  return {
    [id]: {
      ...state.sourcererScopes[id],
      ...rest,
      selectedPatterns,
      ...(isEmpty(selectedPatterns) || dataView == null
        ? id === SourcererScopeName.timeline
          ? defaultDataViewByEventType({ state, eventType })
          : { selectedPatterns: getScopePatternListSelection(dataView, id, state.signalIndexName) }
        : {}),
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
  console.log('eh');
  if (!isEmpty(signalIndexName) && (eventType === 'signal' || eventType === 'alert')) {
    return patternList.filter((index) => index === signalIndexName).sort();
  } else if (eventType === 'raw') {
    return patternList.filter((index) => index !== signalIndexName).sort();
  }
  return { selectedPatterns: patternList.sort(), selectedDataViewId: id };
};
