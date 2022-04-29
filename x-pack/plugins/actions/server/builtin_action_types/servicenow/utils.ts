/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { Logger } from '@kbn/core/server';
import {
  ExternalServiceCredentials,
  Incident,
  PartialIncident,
  ResponseError,
  ServiceNowError,
  ServiceNowPublicConfigurationType,
  ServiceNowSecretConfigurationType,
} from './types';
import { FIELD_PREFIX } from './config';
import { addTimeZoneToDate, getErrorMessage } from '../lib/axios_utils';
import * as i18n from './translations';
import { ActionsConfigurationUtilities } from '../../actions_config';
import { ConnectorTokenClientContract } from '../../types';
import { createJWTAssertion } from '../lib/create_jwt_assertion';
import { requestOAuthJWTToken } from '../lib/request_oauth_jwt_token';

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

export interface GetAccessTokenAndAxiosInstanceOpts {
  connectorId: string;
  logger: Logger;
  configurationUtilities: ActionsConfigurationUtilities;
  credentials: ExternalServiceCredentials;
  snServiceUrl: string;
  connectorTokenClient: ConnectorTokenClientContract;
}

export const getAxiosInstance = ({
  connectorId,
  logger,
  configurationUtilities,
  credentials,
  snServiceUrl,
  connectorTokenClient,
}: GetAccessTokenAndAxiosInstanceOpts): AxiosInstance => {
  const { config, secrets } = credentials;
  const { isOAuth } = config as ServiceNowPublicConfigurationType;
  const { username, password } = secrets as ServiceNowSecretConfigurationType;

  let axiosInstance;

  if (!isOAuth && username && password) {
    axiosInstance = axios.create({
      auth: { username, password },
    });
  } else {
    axiosInstance = axios.create();
    axiosInstance.interceptors.request.use(
      async (axiosConfig: AxiosRequestConfig) => {
        const accessToken = await getAccessToken({
          connectorId,
          logger,
          configurationUtilities,
          credentials: {
            config: config as ServiceNowPublicConfigurationType,
            secrets,
          },
          snServiceUrl,
          connectorTokenClient,
        });
        axiosConfig.headers.Authorization = accessToken;
        return axiosConfig;
      },
      (error) => {
        Promise.reject(error);
      }
    );
  }

  return axiosInstance;
};

export const getAccessToken = async ({
  connectorId,
  logger,
  configurationUtilities,
  credentials,
  snServiceUrl,
  connectorTokenClient,
}: GetAccessTokenAndAxiosInstanceOpts) => {
  const { isOAuth, clientId, jwtKeyId, userIdentifierValue } =
    credentials.config as ServiceNowPublicConfigurationType;
  const { clientSecret, privateKey, privateKeyPassword } =
    credentials.secrets as ServiceNowSecretConfigurationType;

  let accessToken: string;

  // Check if there is a token stored for this connector
  const { connectorToken, hasErrors } = await connectorTokenClient.get({ connectorId });

  if (connectorToken === null || Date.parse(connectorToken.expiresAt) <= Date.now()) {
    // generate a new assertion
    if (
      !isOAuth ||
      !clientId ||
      !clientSecret ||
      !jwtKeyId ||
      !privateKey ||
      !userIdentifierValue
    ) {
      return null;
    }

    const assertion = createJWTAssertion(logger, privateKey, privateKeyPassword, {
      audience: clientId,
      issuer: clientId,
      subject: userIdentifierValue,
      keyId: jwtKeyId,
    });

    // request access token with jwt assertion
    const tokenResult = await requestOAuthJWTToken(
      `${snServiceUrl}/oauth_token.do`,
      {
        clientId,
        clientSecret,
        assertion,
      },
      logger,
      configurationUtilities
    );
    accessToken = `${tokenResult.tokenType} ${tokenResult.accessToken}`;

    // try to update connector_token SO
    try {
      await connectorTokenClient.updateOrReplace({
        connectorId,
        token: connectorToken,
        newToken: accessToken,
        expiresInSec: tokenResult.expiresIn,
        deleteExisting: hasErrors,
      });
    } catch (err) {
      logger.warn(
        `Not able to update ServiceNow connector token for connectorId: ${connectorId} due to error: ${err.message}`
      );
    }
  } else {
    // use existing valid token
    accessToken = connectorToken.token;
  }
  return accessToken;
};
