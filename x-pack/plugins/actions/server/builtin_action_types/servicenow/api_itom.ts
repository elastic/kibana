/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { api } from './api';
import {
  ExecutorSubActionAddEventParams,
  AddEventApiHandlerArgs,
  ExternalServiceApiITOM,
} from './types';

const formatTimeOfEvent = (timeOfEvent: string | null): string | undefined => {
  try {
    if (timeOfEvent != null) {
      return new Date(timeOfEvent).toISOString();
    }
  } catch (error) {
    // silence errors
  }
};

const removeNullValues = (
  params: ExecutorSubActionAddEventParams
): ExecutorSubActionAddEventParams =>
  (Object.keys(params) as Array<keyof ExecutorSubActionAddEventParams>).reduce(
    (acc, key) => ({
      ...acc,
      ...(params[key] != null ? { [key]: params[key] } : {}),
    }),
    {} as ExecutorSubActionAddEventParams
  );

export const prepareParams = (
  params: ExecutorSubActionAddEventParams
): ExecutorSubActionAddEventParams => {
  const timeOfEvent = formatTimeOfEvent(params.time_of_event);
  return removeNullValues({
    ...params,
    time_of_event: timeOfEvent ?? null,
  });
};

const addEventServiceHandler = async ({
  externalService,
  params,
}: AddEventApiHandlerArgs): Promise<void> => {
  const itomExternalService = externalService;
  const preparedParams = prepareParams(params);
  await itomExternalService.addEvent(preparedParams);
};

export const apiITOM: ExternalServiceApiITOM = {
  getChoices: api.getChoices,
  addEvent: addEventServiceHandler,
};
