/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { KibanaIndexPattern, SourcererModel, SourcererScopeName } from './model';
import { TimelineEventsType } from '../../../../common';
import { DEFAULT_INDEX_PATTERN_ID } from '../../../../common/constants';

export interface Args {
  eventType?: TimelineEventsType;
  id: SourcererScopeName;
  selectedPatterns: string[];
  state: SourcererModel;
}

export const getPatternList = (kip: KibanaIndexPattern): string[] => kip.title.split(',');

export const getScopePatternListSelection = (
  kibanaIndexPatterns: KibanaIndexPattern[],
  kipId: string,
  sourcererScope: SourcererScopeName
): string[] => {
  const theKip = kibanaIndexPatterns.find((kip) => kip.id === kipId);
  let patternList: string[] = theKip != null ? theKip.patternList : [];
  if (kipId === DEFAULT_INDEX_PATTERN_ID) {
    // last index in DEFAULT_INDEX_PATTERN_ID is always signals index
    // TODO: Steph.sourcerer is that true tho? ^^
    if (sourcererScope === SourcererScopeName.default) {
      patternList.pop();
    } else if (sourcererScope === SourcererScopeName.detections) {
      patternList = [patternList[patternList.length - 1]];
    }
  }
  return patternList;
};

export const createDefaultIndexPatterns = ({ eventType, id, selectedPatterns, state }: Args) => {
  const kibanaIndexPatterns = state.kibanaIndexPatterns.map((kip) => kip.title);
  const securitySolutionIndexPattern = state.defaultIndexPattern.patternList;
  const newSelectedPatterns = selectedPatterns.filter(
    (sp) =>
      kibanaIndexPatterns.includes(sp) ||
      (!isEmpty(state.signalIndexName) && state.signalIndexName === sp)
  );
  if (isEmpty(newSelectedPatterns)) {
    let defaultPatternList = securitySolutionIndexPattern;
    if (id === SourcererScopeName.timeline && isEmpty(newSelectedPatterns)) {
      defaultPatternList = defaultIndexPatternByEventType({ state, eventType });
    } else if (id === SourcererScopeName.detections && isEmpty(newSelectedPatterns)) {
      defaultPatternList = [state.signalIndexName ?? ''];
    }
    console.log('defaultPatternList', JSON.stringify(defaultPatternList, null, 2));
    return defaultPatternList;
  }
  return newSelectedPatterns;
};

export const defaultSelectedPatternListByEventType = ({
  state,
  eventType,
}: {
  state: SourcererModel;
  eventType?: TimelineEventsType;
}) => {
  let defaultIndexPatterns = state.defaultIndexPattern.patternList;
  if (eventType === 'all' && !isEmpty(state.signalIndexName)) {
    defaultIndexPatterns = [...defaultIndexPatterns, state.signalIndexName ?? ''];
  } else if (!isEmpty(state.signalIndexName) && (eventType === 'signal' || eventType === 'alert')) {
    defaultIndexPatterns = [state.signalIndexName ?? ''];
  }
  return defaultIndexPatterns;
};

export const defaultIndexPatternByEventType = ({
  state,
  eventType,
}: {
  state: SourcererModel;
  eventType?: TimelineEventsType;
}) => {
  let defaultIndexPatterns = state.defaultIndexPattern.patternList;
  if (eventType === 'all' && !isEmpty(state.signalIndexName)) {
    defaultIndexPatterns = [...defaultIndexPatterns, state.signalIndexName ?? ''];
  } else if (!isEmpty(state.signalIndexName) && (eventType === 'signal' || eventType === 'alert')) {
    defaultIndexPatterns = [state.signalIndexName ?? ''];
  }
  return defaultIndexPatterns;
};
