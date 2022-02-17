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

const isValidDate = (d: Date) => !isNaN(d.valueOf());

const formatTimeOfEvent = (timeOfEvent: string | null): string | undefined => {
  if (timeOfEvent != null) {
    const date = new Date(timeOfEvent);

    return isValidDate(date)
      ? // The format is: yyyy-MM-dd HH:mm:ss GMT
        date.toLocaleDateString('en-CA', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          hour12: false,
          minute: '2-digit',
          second: '2-digit',
          timeZone: 'GMT',
        })
      : undefined;
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
