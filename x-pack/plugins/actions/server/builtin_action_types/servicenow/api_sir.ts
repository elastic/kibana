/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ExecutorSubActionPushParamsSIR,
  ExternalServiceAPI,
  ExternalServiceSIR,
  ObservableTypes,
  PushToServiceApiHandlerArgs,
  PushToServiceResponse,
} from './types';

import { api } from './api';

const formatObservables = (observables: string | string[], type: ObservableTypes) => {
  /**
   * ServiceNow accepted formats are: comma, new line, tab, or pipe separators.
   * Before the application the observables were being sent to ServiceNow as a concatenated string with
   * delimiter. With the application the format changed to an array of observables.
   */
  const obsAsArray = Array.isArray(observables) ? observables : observables.split(/[ ,|\r\n\t]+/);
  return obsAsArray.map((obs) => ({ value: obs, type }));
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
    [destIP ?? [], ObservableTypes.ip4],
    [sourceIP ?? [], ObservableTypes.ip4],
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
