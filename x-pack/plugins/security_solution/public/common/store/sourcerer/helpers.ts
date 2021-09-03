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

export const getScopePatternListSelection = (
  theKip: KibanaIndexPattern | undefined,
  sourcererScope: SourcererScopeName,
  signalIndexName: SourcererModel['signalIndexName']
): string[] => {
  let patternList: string[] = theKip != null ? theKip.patternList : [];

  // when our SIEM KIP is set, here are the defaults
  if (theKip && theKip.id === DEFAULT_INDEX_PATTERN_ID) {
    if (sourcererScope === SourcererScopeName.default) {
      patternList = patternList.filter((index) => index !== signalIndexName).sort();
    } else if (sourcererScope === SourcererScopeName.detections) {
      patternList = patternList.filter((index) => index === signalIndexName);
    }
  }
  return patternList.sort();
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
    return defaultPatternList;
  }
  return newSelectedPatterns;
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
