/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// eslint-disable-next-line no-restricted-imports
import isEmpty from 'lodash/isEmpty';
import { SourcererModel, SourcererScopeName } from './model';
import { TimelineEventsType } from '../../../../common/types/timeline';

export interface Args {
  eventType?: TimelineEventsType;
  id: SourcererScopeName;
  selectedPatterns: string[];
  state: SourcererModel;
}
export const createDefaultIndexPatterns = ({ eventType, id, selectedPatterns, state }: Args) => {
  const kibanaIndexPatterns = state.kibanaIndexPatterns.map((kip) => kip.title);
  const newSelectedPatterns = selectedPatterns.filter(
    (sp) =>
      state.configIndexPatterns.includes(sp) ||
      kibanaIndexPatterns.includes(sp) ||
      (!isEmpty(state.signalIndexName) && state.signalIndexName === sp)
  );
  if (isEmpty(newSelectedPatterns)) {
    let defaultIndexPatterns = state.configIndexPatterns;
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
  let defaultIndexPatterns = state.configIndexPatterns;
  if (eventType === 'all' && !isEmpty(state.signalIndexName)) {
    defaultIndexPatterns = [...state.configIndexPatterns, state.signalIndexName ?? ''];
  } else if (eventType === 'raw') {
    defaultIndexPatterns = state.configIndexPatterns;
  } else if (!isEmpty(state.signalIndexName) && (eventType === 'signal' || eventType === 'alert')) {
    defaultIndexPatterns = [state.signalIndexName ?? ''];
  }
  return defaultIndexPatterns;
};
