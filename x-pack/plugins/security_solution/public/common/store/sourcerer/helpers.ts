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

// TODO: Steph/sourcerer eventType will be alerts only, when ui updates delete raw
export const defaultIndexPatternByEventType = ({
  state,
  eventType,
}: {
  state: SourcererModel;
  eventType?: TimelineEventsType;
}) => {
  const {
    signalIndexName,
    defaultIndexPattern: { id, patternList },
  } = state;

  if (!isEmpty(signalIndexName) && (eventType === 'signal' || eventType === 'alert')) {
    return patternList.filter((index) => index === signalIndexName).sort();
  } else if (eventType === 'raw') {
    return patternList.filter((index) => index !== signalIndexName).sort();
  }
  return { selectedPatterns: patternList.sort(), selectedKipId: id };
};
