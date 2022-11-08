/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, isString } from 'lodash';

import {
  ExecutorSubActionPushParamsSIR,
  ExternalServiceAPI,
  ExternalServiceSIR,
  ObservableTypes,
  PushToServiceApiHandlerArgs,
  PushToServiceApiParamsSIR,
  PushToServiceResponse,
} from './types';

import { api } from './api';

const SPLIT_REGEX = /[ ,|\r\n\t]+/;

export const formatObservables = (observables: string[], type: ObservableTypes) => {
  /**
   * ServiceNow accepted formats are: comma, new line, tab, or pipe separators.
   * Before the application the observables were being sent to ServiceNow as a concatenated string with
   * delimiter. With the application the format changed to an array of observables.
   */
  const uniqueObservables = new Set(observables);
  return [...uniqueObservables].filter((obs) => !isEmpty(obs)).map((obs) => ({ value: obs, type }));
};

const obsAsArray = (obs: string | string[]): string[] => {
  if (isEmpty(obs)) {
    return [];
  }

  if (isString(obs)) {
    return obs.split(SPLIT_REGEX);
  }

  return obs;
};

export const combineObservables = (a: string | string[], b: string | string[]): string[] => {
  const first = obsAsArray(a);
  const second = obsAsArray(b);

  return [...first, ...second];
};

const observablesToString = (obs: string | string[] | null | undefined): string | null => {
  if (Array.isArray(obs)) {
    return obs.join(',');
  }

  return obs ?? null;
};

export const prepareParams = (
  usesTableApi: boolean,
  params: PushToServiceApiParamsSIR
): PushToServiceApiParamsSIR => {
  if (usesTableApi) {
    /**
     * The schema has change to accept an array of observables
     * or a string. In the case of connector that uses the old API we need to
     * convert the observables to a string
     */
    return {
      ...params,
      incident: {
        ...params.incident,
        dest_ip: observablesToString(params.incident.dest_ip),
        malware_hash: observablesToString(params.incident.malware_hash),
        malware_url: observablesToString(params.incident.malware_url),
        source_ip: observablesToString(params.incident.source_ip),
      },
    };
  }

  /**
   * For connectors that do not use the old API
   * the observables will be added in a different call.
   * They need to be set to null when sending the fields
   * to ServiceNow
   */
  return {
    ...params,
    incident: {
      ...params.incident,
      dest_ip: null,
      malware_hash: null,
      malware_url: null,
      source_ip: null,
    },
  };
};

const pushToServiceHandler = async ({
  externalService,
  params,
  config,
  secrets,
  commentFieldKey,
  logger,
}: PushToServiceApiHandlerArgs): Promise<PushToServiceResponse> => {
  const res = await api.pushToService({
    externalService,
    params: prepareParams(!!config.usesTableApi, params as PushToServiceApiParamsSIR),
    config,
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

  /**
   * Add bulk observables is only available for new connectors
   * Old connectors gonna add their observables
   * through the pushToService call.
   */

  if (!config.usesTableApi) {
    const sirExternalService = externalService as ExternalServiceSIR;

    const obsWithType: Array<[string[], ObservableTypes]> = [
      [combineObservables(destIP ?? [], sourceIP ?? []), ObservableTypes.ip4],
      [obsAsArray(malwareHash ?? []), ObservableTypes.sha256],
      [obsAsArray(malwareUrl ?? []), ObservableTypes.url],
    ];

    const observables = obsWithType.map(([obs, type]) => formatObservables(obs, type)).flat();
    if (observables.length > 0) {
      await sirExternalService.bulkAddObservableToIncident(observables, res.id);
    }
  }

  return res;
};

export const apiSIR: ExternalServiceAPI = {
  ...api,
  pushToService: pushToServiceHandler,
};
