/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '../../../../../../src/core/server';
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
import { requestOAuthJWTToken } from '../lib/request_oauth_jwt_token';
import { ConnectorTokenClientContract } from '../../types';
import { createJWTAssertion } from '../lib/create_jwt_assertion';

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

export const getAccessToken = async (
  connectorId: string,
  logger: Logger,
  configurationUtilities: ActionsConfigurationUtilities,
  credentials: ExternalServiceCredentials,
  snServiceUrl: string,
  connectorTokenClient: ConnectorTokenClientContract
) => {
  const { isOAuth, clientId, jwtKeyId, userIdentifierType, userIdentifierValue } =
    credentials.config as ServiceNowPublicConfigurationType;
  const { clientSecret, privateKey, privateKeyPassword } =
    credentials.secrets as ServiceNowSecretConfigurationType;

  let accessToken: string;

  const { connectorToken, hasErrors } = await connectorTokenClient.get({ connectorId });

  if (connectorToken === null || Date.parse(connectorToken.expiresAt) <= Date.now()) {
    // generate assertion
    if (
      !isOAuth ||
      !clientId ||
      !clientSecret ||
      !jwtKeyId ||
      !privateKey ||
      !userIdentifierType ||
      !userIdentifierValue ||
      !privateKeyPassword
    ) {
      return null;
    }
    const assertion = createJWTAssertion(logger, privateKey, privateKeyPassword, {
      audience: clientId, // must match the value of the Client ID
      issuer: clientId, // recommended to match the value of the Client ID.
      subject: userIdentifierValue, //  must be a user identifier, such as the user's mail that you want to associate the token with.
      keyId: jwtKeyId,
    });
    // request new access token
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
      if (connectorToken === null) {
        if (hasErrors) {
          // delete existing access tokens
          await connectorTokenClient.deleteConnectorTokens({
            connectorId,
            tokenType: 'access_token',
          });
        }
        await connectorTokenClient.create({
          connectorId,
          token: accessToken,
          // convert ServiceNow expiresIn from seconds to milliseconds
          expiresAtMillis: new Date(Date.now() + tokenResult.expiresIn * 1000).toISOString(),
          tokenType: 'access_token',
        });
      } else {
        await connectorTokenClient.update({
          id: connectorToken.id!.toString(),
          token: accessToken,
          // convert ServiceNow expiresIn from seconds to milliseconds
          expiresAtMillis: new Date(Date.now() + tokenResult.expiresIn * 1000).toISOString(),
          tokenType: 'access_token',
        });
      }
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
