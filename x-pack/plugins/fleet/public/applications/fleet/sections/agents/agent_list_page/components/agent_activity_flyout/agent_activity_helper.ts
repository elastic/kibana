/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionStatus } from '../../../../../types';

const today = () => new Date().toISOString().substring(0, 10);

export function getOtherDaysActions(actions: ActionStatus[]) {
  const otherDays: { [day: string]: ActionStatus[] } = {};
  actions
    .filter((a) => !a.creationTime.startsWith(today()))
    .forEach((action) => {
      const day = action.creationTime.substring(0, 10);
      if (!otherDays[day]) {
        otherDays[day] = [];
      }
      otherDays[day].push(action);
    });
  return otherDays;
}

export function getTodayActions(actions: ActionStatus[]) {
  const todayActions = actions.filter((a) => a.creationTime.startsWith(today()));
  return todayActions;
}
