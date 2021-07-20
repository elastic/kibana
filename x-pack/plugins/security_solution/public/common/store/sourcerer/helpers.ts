/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { KibanaIndexPattern, SourcererModel, SourcererScopeName } from './model';
import { TimelineEventsType } from '../../../../common';

export interface Args {
  eventType?: TimelineEventsType;
  id: SourcererScopeName;
  selectedPatterns: string[];
  state: SourcererModel;
}

export const getPatternList = (kip: KibanaIndexPattern): string[] => [kip.title]; // kip.title.split(','); // TODO: Steph/sourcerer implement splitting KIPs

export const createDefaultIndexPatterns = ({ eventType, id, selectedPatterns, state }: Args) => {
  const kibanaIndexPatterns = state.kibanaIndexPatterns.map((kip) => kip.title);
  const securitySolutionIndexPattern = getPatternList(state.defaultIndexPattern);
  const newSelectedPatterns = selectedPatterns.filter(
    (sp) =>
      kibanaIndexPatterns.includes(sp) ||
      (!isEmpty(state.signalIndexName) && state.signalIndexName === sp)
  );
  if (isEmpty(newSelectedPatterns)) {
    let defaultIndexPatterns = securitySolutionIndexPattern;
    if (id === SourcererScopeName.timeline && isEmpty(newSelectedPatterns)) {
      defaultIndexPatterns = defaultIndexPatternByEventType({ state, eventType });
    } else if (id === SourcererScopeName.detections && isEmpty(newSelectedPatterns)) {
      defaultIndexPatterns = [state.signalIndexName ?? ''];
    }
    return defaultIndexPatterns;
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
  let defaultIndexPatterns = getPatternList(state.defaultIndexPattern);
  if (eventType === 'all' && !isEmpty(state.signalIndexName)) {
    defaultIndexPatterns = [...defaultIndexPatterns, state.signalIndexName ?? ''];
  } else if (!isEmpty(state.signalIndexName) && (eventType === 'signal' || eventType === 'alert')) {
    defaultIndexPatterns = [state.signalIndexName ?? ''];
  }
  return defaultIndexPatterns;
};
