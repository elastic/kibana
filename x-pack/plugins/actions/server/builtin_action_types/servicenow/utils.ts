/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core/server';
import { Incident, PartialIncident, ResponseError, ServiceNowError } from './types';
import { FIELD_PREFIX } from './config';
import { addTimeZoneToDate, getErrorMessage } from '../lib/axios_utils';
import * as i18n from './translations';

export const prepareIncident = (useOldApi: boolean, incident: PartialIncident): PartialIncident =>
  useOldApi
    ? incident
    : Object.entries(incident).reduce(
        (acc, [key, value]) => ({ ...acc, [`${FIELD_PREFIX}${key}`]: value }),
        {} as Incident
      );

const createErrorMessage = (errorResponse?: ServiceNowError): string => {
  if (errorResponse == null) {
    return 'unknown: errorResponse was null';
  }

  const { error } = errorResponse;
  return error != null
    ? `${error?.message}: ${error?.detail}`
    : 'unknown: no error in error response';
};

export const createServiceError = (error: ResponseError, message: string) =>
  new Error(
    getErrorMessage(
      i18n.SERVICENOW,
      `${message}. Error: ${error.message} Reason: ${createErrorMessage(error.response?.data)}`
    )
  );

export const getPushedDate = (timestamp?: string) => {
  if (timestamp != null) {
    return new Date(addTimeZoneToDate(timestamp)).toISOString();
  }

  return new Date().toISOString();
};

export const throwIfSubActionIsNotSupported = ({
  api,
  subAction,
  supportedSubActions,
  logger,
}: {
  api: Record<string, unknown>;
  subAction: string;
  supportedSubActions: string[];
  logger: Logger;
}) => {
  if (!api[subAction]) {
    const errorMessage = `[Action][ExternalService] Unsupported subAction type ${subAction}.`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  if (!supportedSubActions.includes(subAction)) {
    const errorMessage = `[Action][ExternalService] subAction ${subAction} not implemented.`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }
};
