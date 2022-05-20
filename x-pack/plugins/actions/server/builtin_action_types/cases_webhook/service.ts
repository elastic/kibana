/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios, { AxiosResponse } from 'axios';

import { Logger } from '@kbn/core/server';
import {
  createServiceError,
  getObjectValueByKey,
  getPushedDate,
  throwIfResponseIsNotValidSpecial,
} from './utils';
import {
  CreateIncidentParams,
  ExternalServiceCredentials,
  ExternalService,
  CasesWebhookPublicConfigurationType,
  CasesWebhookSecretConfigurationType,
  ExternalServiceIncidentResponse,
  GetIncidentResponse,
} from './types';

import * as i18n from './translations';
import { request } from '../lib/axios_utils';
import { ActionsConfigurationUtilities } from '../../actions_config';

export const createExternalService = (
  actionId: string,
  { config, secrets }: ExternalServiceCredentials,
  logger: Logger,
  configurationUtilities: ActionsConfigurationUtilities
): ExternalService => {
  const {
    createIncidentResponseKey,
    createIncidentUrl: createIncidentUrlConfig,
    getIncidentUrl: getIncidentUrlConfig,
    createIncidentJson,
    getIncidentResponseCreatedDateKey,
    getIncidentResponseExternalTitleKey,
    getIncidentResponseUpdatedDateKey,
    incidentViewUrl,
  } = config as CasesWebhookPublicConfigurationType;
  const { password, user } = secrets as CasesWebhookSecretConfigurationType;
  if (!getIncidentUrlConfig || !password || !user) {
    throw Error(`[Action]${i18n.NAME}: Wrong configuration.`);
  }

  const createIncidentUrl = createIncidentUrlConfig.endsWith('/')
    ? createIncidentUrlConfig.slice(0, -1)
    : createIncidentUrlConfig;

  const getIncidentUrl = getIncidentUrlConfig.endsWith('/')
    ? getIncidentUrlConfig.slice(0, -1)
    : getIncidentUrlConfig;

  const getIncidentViewURL = (id: string) =>
    `${
      incidentViewUrl.endsWith('=')
        ? incidentViewUrl
        : incidentViewUrl.endsWith('/')
        ? incidentViewUrl
        : `${incidentViewUrl}/`
    }${id}`;

  const axiosInstance = axios.create({
    auth: { username: user, password },
  });

  const getIncident = async (id: string): Promise<GetIncidentResponse> => {
    try {
      const res = await request({
        axios: axiosInstance,
        url: `${getIncidentUrl}/${id}`,
        logger,
        configurationUtilities,
      });

      throwIfResponseIsNotValidSpecial({
        res,
        requiredAttributesToBeInTheResponse: [
          getIncidentResponseCreatedDateKey,
          getIncidentResponseExternalTitleKey,
          getIncidentResponseUpdatedDateKey,
        ],
      });

      const title = getObjectValueByKey(res.data, getIncidentResponseExternalTitleKey);
      const created = getObjectValueByKey(res.data, getIncidentResponseCreatedDateKey);
      const updated = getObjectValueByKey(res.data, getIncidentResponseUpdatedDateKey);

      return { id, title, created, updated };
    } catch (error) {
      throw createServiceError(error, 'Unable to get incident');
    }
  };

  const replaceSumDesc = (sum: string, desc: string) => {
    let str = createIncidentJson; // incident is stringified object
    str = str.replace('$SUM', sum);
    str = str.replace('$DESC', desc);
    return JSON.parse(str);
  };

  const createIncident = async ({
    incident,
  }: CreateIncidentParams): Promise<ExternalServiceIncidentResponse> => {
    const { summary, description } = incident;
    try {
      const res: AxiosResponse = await request({
        axios: axiosInstance,
        url: `${createIncidentUrl}`,
        logger,
        method: 'post',
        data: replaceSumDesc(summary, description ?? ''),
        configurationUtilities,
      });

      const { status, statusText, data } = res;

      throwIfResponseIsNotValidSpecial({
        res,
        requiredAttributesToBeInTheResponse: [createIncidentResponseKey],
      });
      const incidentId = getObjectValueByKey(data, createIncidentResponseKey);
      const insertedIncident = await getIncident(incidentId);

      logger.debug(`response from webhook action "${actionId}": [HTTP ${status}] ${statusText}`);

      return {
        id: incidentId,
        title: insertedIncident.title,
        url: getIncidentViewURL(incidentId),
        pushedDate: getPushedDate(insertedIncident.created),
      };
    } catch (error) {
      throw createServiceError(error, 'Unable to create incident');
    }
  };

  // const updateIncident = async ({
  //   incidentId,
  //   incident,
  // }: UpdateIncidentParams): Promise<ExternalServiceIncidentResponse> => {
  //   const incidentWithoutNullValues = Object.entries(incident).reduce(
  //     (obj, [key, value]) => (value != null ? { ...obj, [key]: value } : obj),
  //     {} as Incident
  //   );
  //
  //   const fields = createFields(projectKey, incidentWithoutNullValues);
  //
  //   try {
  //     const res = await request({
  //       axios: axiosInstance,
  //       method: 'put',
  //       url: `${createIncidentUrl}/${incidentId}`,
  //       logger,
  //       data: { fields },
  //       configurationUtilities,
  //     });
  //
  //     throwIfResponseIsNotValid({
  //       res,
  //     });
  //
  //     const updatedIncident = await getIncident(incidentId as string);
  //
  //     return {
  //       title: updatedIncident.key,
  //       id: updatedIncident.id,
  //       pushedDate: new Date(updatedIncident.updated).toISOString(),
  //       url: getIncidentViewURL(updatedIncident.key),
  //     };
  //   } catch (error) {
  //     throw new Error(
  //       getErrorMessage(
  //         i18n.NAME,
  //         `Unable to update incident with id ${incidentId}. Error: ${
  //           error.message
  //         }. Reason: ${createErrorMessage(error.response?.data)}`
  //       )
  //     );
  //   }
  // };
  //
  // const createComment = async ({
  //   incidentId,
  //   comment,
  // }: CreateCommentParams): Promise<ExternalServiceCommentResponse> => {
  //   try {
  //     const res = await request({
  //       axios: axiosInstance,
  //       method: 'post',
  //       url: getCommentsURL(incidentId),
  //       logger,
  //       data: { body: comment.comment },
  //       configurationUtilities,
  //     });
  //
  //     throwIfResponseIsNotValid({
  //       res,
  //       requiredAttributesToBeInTheResponse: ['id', 'created'],
  //     });
  //
  //     return {
  //       commentId: comment.commentId,
  //       externalCommentId: res.data.id,
  //       pushedDate: new Date(res.data.created).toISOString(),
  //     };
  //   } catch (error) {
  //     throw new Error(
  //       getErrorMessage(
  //         i18n.NAME,
  //         `Unable to create comment at incident with id ${incidentId}. Error: ${
  //           error.message
  //         }. Reason: ${createErrorMessage(error.response?.data)}`
  //       )
  //     );
  //   }
  // };

  return {
    getIncident,
    createIncident,
    // updateIncident,
    // createComment,
  };
};
