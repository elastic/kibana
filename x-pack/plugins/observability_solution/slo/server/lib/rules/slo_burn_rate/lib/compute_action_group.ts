/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_ACTION,
  HIGH_PRIORITY_ACTION,
  IMPROVING_PRIORITY_ACTION,
  LOW_PRIORITY_ACTION,
  MEDIUM_PRIORITY_ACTION,
  SUPPRESSED_PRIORITY_ACTION,
} from '../../../../../common/constants';
import { InstanceHistory, InstanceHistoryRecord } from '../../../../../common/types';

const serverityLevelLookup = {
  [ALERT_ACTION.id]: 4,
  [HIGH_PRIORITY_ACTION.id]: 3,
  [MEDIUM_PRIORITY_ACTION.id]: 2,
  [LOW_PRIORITY_ACTION.id]: 1,
};

function createDefaultHistoryEvent(startedAt: Date, actionGroup: string, shouldSuppress: boolean) {
  return {
    actionGroup,
    suppressed: shouldSuppress,
    timerange: { from: startedAt.valueOf() },
  };
}

export function computeActionGroup(
  startedAt: Date,
  history: InstanceHistory[],
  instanceId: string,
  actionGroup: string,
  shouldSuppress: boolean
): {
  actionGroup: string;
  latestHistoryEvent: InstanceHistoryRecord;
  historyRecord: InstanceHistory;
} {
  const historyRecord = history.find((record) => record.instanceId === instanceId);
  if (historyRecord) {
    const latestHistoryEvent = historyRecord.history.pop();

    if (latestHistoryEvent) {
      const lastSeverity = serverityLevelLookup[latestHistoryEvent.actionGroup];
      const currentSeverity = serverityLevelLookup[actionGroup];

      // Improving from the previous action group
      if (lastSeverity > currentSeverity) {
        latestHistoryEvent.timerange.to = Date.now();
        historyRecord.history.push({
          ...latestHistoryEvent,
          timerange: { ...latestHistoryEvent.timerange, to: startedAt.valueOf() },
        });
        const nextHistoryEvent = {
          actionGroup,
          improvingFrom: latestHistoryEvent.actionGroup,
          suppressed: false,
          timerange: { from: startedAt.valueOf() },
        };
        historyRecord.history.push(nextHistoryEvent);
        return {
          actionGroup: IMPROVING_PRIORITY_ACTION.id,
          latestHistoryEvent: nextHistoryEvent,
          historyRecord,
        };
      }

      // Nothing has changed, still improving
      if (latestHistoryEvent.improvingFrom && latestHistoryEvent.improvingFrom !== actionGroup) {
        historyRecord.history.push(latestHistoryEvent);
        return { actionGroup: IMPROVING_PRIORITY_ACTION.id, latestHistoryEvent, historyRecord };
      }

      // If the action group has changed, stop the current history event and start a new one
      if (latestHistoryEvent.actionGroup !== actionGroup) {
        historyRecord.history.push({
          ...latestHistoryEvent,
          timerange: { ...latestHistoryEvent.timerange, to: startedAt.valueOf() },
        });
        const nextHistoryEvent = {
          actionGroup,
          suppressed: shouldSuppress,
          timerange: { from: startedAt.valueOf() },
        };
        historyRecord.history.push(nextHistoryEvent);
        return {
          actionGroup: shouldSuppress ? SUPPRESSED_PRIORITY_ACTION.id : actionGroup,
          latestHistoryEvent: nextHistoryEvent,
          historyRecord,
        };
      }

      // Nothing has changed
      historyRecord.history.push(latestHistoryEvent);
      return {
        actionGroup: shouldSuppress ? SUPPRESSED_PRIORITY_ACTION.id : actionGroup,
        latestHistoryEvent,
        historyRecord,
      };
    }
  }

  const historyEvent = createDefaultHistoryEvent(startedAt, actionGroup, shouldSuppress);
  return {
    actionGroup: shouldSuppress ? SUPPRESSED_PRIORITY_ACTION.id : actionGroup,
    latestHistoryEvent: historyEvent,
    historyRecord: { instanceId, history: [historyEvent] },
  };
}
