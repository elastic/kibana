/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isString } from 'lodash';

import {
  ExecutorSubActionPushParamsSIR,
  ExternalServiceAPI,
  ExternalServiceSIR,
  ObservableTypes,
  PushToServiceApiHandlerArgs,
  PushToServiceResponse,
} from './types';

import { api } from './api';

const SPLIT_REGEX = /[ ,|\r\n\t]+/;

const formatObservables = (observables: string | string[], type: ObservableTypes) => {
  /**
   * ServiceNow accepted formats are: comma, new line, tab, or pipe separators.
   * Before the application the observables were being sent to ServiceNow as a concatenated string with
   * delimiter. With the application the format changed to an array of observables.
   */
  const obsAsArray = Array.isArray(observables) ? observables : observables.split(SPLIT_REGEX);
  const uniqueObservables = new Set(obsAsArray);
  return [...uniqueObservables].map((obs) => ({ value: obs, type }));
};

const combineObservables = (a: string | string[], b: string | string[]): string | string[] => {
  if (isString(a) && Array.isArray(b)) {
    return [...b, ...a.split(SPLIT_REGEX)];
  }

  if (isString(b) && Array.isArray(a)) {
    return [...a, ...b.split(SPLIT_REGEX)];
  }

  return Array.isArray(a) && Array.isArray(b) ? [...a, ...b] : `${a},${b}`;
};

const pushToServiceHandler = async ({
  externalService,
  params,
  secrets,
  commentFieldKey,
  logger,
}: PushToServiceApiHandlerArgs): Promise<PushToServiceResponse> => {
  const res = await api.pushToService({
    externalService,
    params,
    secrets,
    commentFieldKey,
    logger,
  });

  const {
    incident: {
      dest_ip: destIP,
      malware_hash: malwareHash,
      malware_url: malwareUrl,
      source_ip: sourceIP,
    },
  } = params as ExecutorSubActionPushParamsSIR;
  const sirExternalService = externalService as ExternalServiceSIR;

  const obsWithType: Array<[string | string[], ObservableTypes]> = [
    [combineObservables(destIP ?? [], sourceIP ?? []), ObservableTypes.ip4],
    [malwareHash ?? [], ObservableTypes.sha256],
    [malwareUrl ?? [], ObservableTypes.url],
  ];

  const observables = obsWithType.map(([obs, type]) => formatObservables(obs, type)).flat();
  await sirExternalService.bulkAddObservableToIncident(observables, res.id);
  return res;
};

export const apiSIR: ExternalServiceAPI = {
  ...api,
  pushToService: pushToServiceHandler,
};
