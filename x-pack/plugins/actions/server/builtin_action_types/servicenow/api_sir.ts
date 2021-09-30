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
const SPLIT_REGEX_GLOBAL = /[ ,|\r\n\t]+/g;

export const formatObservables = (observables: string | string[], type: ObservableTypes) => {
  /**
   * ServiceNow accepted formats are: comma, new line, tab, or pipe separators.
   * Before the application the observables were being sent to ServiceNow as a concatenated string with
   * delimiter. With the application the format changed to an array of observables.
   */
  const obsAsArray = Array.isArray(observables) ? observables : observables.split(SPLIT_REGEX);
  const uniqueObservables = new Set(obsAsArray);
  return [...uniqueObservables].filter((obs) => !isEmpty(obs)).map((obs) => ({ value: obs, type }));
};

export const combineObservables = (
  a: string | string[],
  b: string | string[]
): string | string[] => {
  // Both are empty
  if (isEmpty(a) && isEmpty(b)) {
    return [];
  }

  /**
   * One of a or b can be empty
   * but not both
   */
  if (isEmpty(a)) {
    return b;
  }

  if (isEmpty(b)) {
    return a;
  }

  /**
   * Neither of a or b is empty
   * a and b can be either a string or an array
   */
  if (isString(a) && Array.isArray(b)) {
    return [...a.split(SPLIT_REGEX), ...b];
  }

  if (Array.isArray(a) && isString(b)) {
    return [...a, ...b.split(SPLIT_REGEX)];
  }

  /**
   * a and b are both an array or a string
   */
  return Array.isArray(a) && Array.isArray(b)
    ? [...a, ...b]
    : isString(a) && isString(b)
    ? `${a.replace(SPLIT_REGEX_GLOBAL, ',')},${b.replace(SPLIT_REGEX_GLOBAL, ',')}`
    : [];
};

const observablesToString = (obs: string | string[] | null | undefined): string | null => {
  if (Array.isArray(obs)) {
    return obs.join(',');
  }

  return obs ?? null;
};

export const prepareParams = (
  isLegacy: boolean,
  params: PushToServiceApiParamsSIR
): PushToServiceApiParamsSIR => {
  if (isLegacy) {
    /**
     * The schema has change to accept an array of observables
     * or a string. In the case of a legacy connector we need to
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
   * For non legacy connectors the observables
   * will be added in a different call.
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
    params: prepareParams(!!config.isLegacy, params as PushToServiceApiParamsSIR),
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

  if (!config.isLegacy) {
    const sirExternalService = externalService as ExternalServiceSIR;

    const obsWithType: Array<[string | string[], ObservableTypes]> = [
      [combineObservables(destIP ?? [], sourceIP ?? []), ObservableTypes.ip4],
      [malwareHash ?? [], ObservableTypes.sha256],
      [malwareUrl ?? [], ObservableTypes.url],
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
