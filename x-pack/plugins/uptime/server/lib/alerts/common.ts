/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRight } from 'fp-ts/lib/Either';
import Mustache from 'mustache';
import { IBasePath } from 'kibana/server';
import { join } from 'path';
import { UptimeCommonState, UptimeCommonStateType } from '../../../common/runtime_types';

export type UpdateUptimeAlertState = (
  state: Record<string, any>,
  isTriggeredNow: boolean
) => UptimeCommonState;

export const updateState: UpdateUptimeAlertState = (state, isTriggeredNow) => {
  const now = new Date().toISOString();
  const decoded = UptimeCommonStateType.decode(state);
  if (!isRight(decoded)) {
    const triggerVal = isTriggeredNow ? now : undefined;
    return {
      currentTriggerStarted: triggerVal,
      firstCheckedAt: now,
      firstTriggeredAt: triggerVal,
      isTriggered: isTriggeredNow,
      lastTriggeredAt: triggerVal,
      lastCheckedAt: now,
      lastResolvedAt: undefined,
    };
  }
  const {
    currentTriggerStarted,
    firstCheckedAt,
    firstTriggeredAt,
    lastTriggeredAt,
    // this is the stale trigger status, we're naming it `wasTriggered`
    // to differentiate it from the `isTriggeredNow` param
    isTriggered: wasTriggered,
    lastResolvedAt,
  } = decoded.right;

  let cts: string | undefined;
  if (isTriggeredNow && !currentTriggerStarted) {
    cts = now;
  } else if (isTriggeredNow) {
    cts = currentTriggerStarted;
  }
  return {
    currentTriggerStarted: cts,
    firstCheckedAt: firstCheckedAt ?? now,
    firstTriggeredAt: isTriggeredNow && !firstTriggeredAt ? now : firstTriggeredAt,
    lastCheckedAt: now,
    lastTriggeredAt: isTriggeredNow ? now : lastTriggeredAt,
    lastResolvedAt: !isTriggeredNow && wasTriggered ? now : lastResolvedAt,
    isTriggered: isTriggeredNow,
  };
};

export const generateAlertMessage = (messageTemplate: string, fields: Record<string, any>) => {
  return Mustache.render(messageTemplate, { state: { ...fields } });
};
export const getViewInAppUrl = (relativeViewInAppUrl: string, basePath: IBasePath) =>
  basePath.publicBaseUrl
    ? new URL(
        join(basePath.serverBasePath, relativeViewInAppUrl),
        basePath.publicBaseUrl
      ).toString()
    : relativeViewInAppUrl;
