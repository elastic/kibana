/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line no-restricted-imports
import isEmpty from 'lodash/isEmpty';
import {
  SelectedPatterns,
  SourcererModel,
  SourcererPatternType,
  SourcererScopeName,
} from './model';
import { TimelineEventsType } from '../../../../common/types/timeline';

export interface Args {
  eventType?: TimelineEventsType;
  id: SourcererScopeName;
  selectedPatterns: SelectedPatterns;
  state: SourcererModel;
}
export const createDefaultIndexPatterns = ({
  eventType,
  id,
  selectedPatterns,
  state,
}: Args): { selectedPatterns: SelectedPatterns; indexNames: string[] } => {
  console.log('createDefaultIndexPatterns', { eventType, id, selectedPatterns, state });
  const kibanaIndexPatterns = state.kibanaIndexPatterns.map((kip) => kip.title);
  const newSelectedPatterns = selectedPatterns.filter(
    ({ title: sp }) =>
      state.configIndexPatterns.includes(sp) ||
      kibanaIndexPatterns.includes(sp) ||
      (!isEmpty(state.signalIndexName) && state.signalIndexName === sp)
  );
  debugger;
  if (isEmpty(newSelectedPatterns)) {
    let defaultIndexPatterns: SelectedPatterns = state.configIndexPatterns.map((title) => ({
      title,
      id: SourcererPatternType.config,
    }));
    if (id === SourcererScopeName.timeline) {
      defaultIndexPatterns = defaultIndexPatternByEventType({ state, eventType });
    } else if (id === SourcererScopeName.detections) {
      defaultIndexPatterns = [
        {
          title: state.signalIndexName ?? '',
          id: SourcererPatternType.detections,
        },
      ];
    }
    debugger;
    return {
      selectedPatterns: defaultIndexPatterns,
      indexNames: defaultIndexPatterns.map(({ title }) => title),
    };
  }
  return {
    selectedPatterns: newSelectedPatterns,
    indexNames: newSelectedPatterns.map(({ title }) => title),
  };
};

export const defaultIndexPatternByEventType = ({
  state,
  eventType,
}: {
  state: SourcererModel;
  eventType?: TimelineEventsType;
}): SelectedPatterns => {
  let defaultIndexPatterns: SelectedPatterns = state.configIndexPatterns.map((title) => ({
    title,
    id: SourcererPatternType.config,
  }));
  if (eventType === 'all' && !isEmpty(state.signalIndexName)) {
    defaultIndexPatterns = [
      ...defaultIndexPatterns,
      {
        title: state.signalIndexName ?? '',
        id: SourcererPatternType.detections,
      },
    ];
  } else if (eventType === 'raw') {
    defaultIndexPatterns = defaultIndexPatterns;
  } else if (!isEmpty(state.signalIndexName) && (eventType === 'signal' || eventType === 'alert')) {
    defaultIndexPatterns = [
      {
        title: state.signalIndexName ?? '',
        id: SourcererPatternType.detections,
      },
    ];
  }
  return defaultIndexPatterns;
};
