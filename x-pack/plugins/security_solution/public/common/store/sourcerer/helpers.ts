/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
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
      kibanaIndexPatterns.includes(sp) ||
      (!isEmpty(state.signalIndexName) && state.signalIndexName === sp)
  );
  if (isEmpty(newSelectedPatterns)) {
    let defaultIndexPatterns = []; // TODO: Steph/sourcerer get new default KIP to be selected by default
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
  let defaultIndexPatterns: string[] = []; // TODO: Steph/sourcerer get new default KIP to be selected by default
  if (eventType === 'all' && !isEmpty(state.signalIndexName)) {
    defaultIndexPatterns = [...[], state.signalIndexName ?? '']; // TODO: Steph/sourcerer get new default KIP to be selected by default
  } else if (eventType === 'raw') {
    defaultIndexPatterns = []; // TODO: Steph/sourcerer get new default KIP to be selected by default
  } else if (!isEmpty(state.signalIndexName) && (eventType === 'signal' || eventType === 'alert')) {
    defaultIndexPatterns = [state.signalIndexName ?? ''];
  }
  return defaultIndexPatterns;
};
