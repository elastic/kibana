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
  makeIncidentUrl,
  removeSlash,
  replaceComment,
  replaceSumDesc,
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
  UpdateIncidentParams,
  CreateCommentParams,
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
    createCommentJson,
    createCommentMethod,
    createCommentUrl,
    createIncidentJson,
    createIncidentMethod,
    createIncidentResponseKey,
    createIncidentUrl: createIncidentUrlConfig,
    getIncidentResponseCreatedDateKey,
    getIncidentResponseExternalTitleKey,
    getIncidentResponseUpdatedDateKey,
    getIncidentUrl,
    incidentViewUrl,
    updateIncidentJson,
    updateIncidentMethod,
    updateIncidentUrl,
  } = config as CasesWebhookPublicConfigurationType;
  const { password, user } = secrets as CasesWebhookSecretConfigurationType;
  if (!getIncidentUrl || !password || !user) {
    throw Error(`[Action]${i18n.NAME}: Wrong configuration.`);
  }

  const createIncidentUrl = removeSlash(createIncidentUrlConfig);

  const axiosInstance = axios.create({
    auth: { username: user, password },
  });

  const getIncident = async (id: string): Promise<GetIncidentResponse> => {
    try {
      const res = await request({
        axios: axiosInstance,
        url: makeIncidentUrl(getIncidentUrl, id),
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

  const createIncident = async ({
    incident,
  }: CreateIncidentParams): Promise<ExternalServiceIncidentResponse> => {
    const { labels, summary, description } = incident;
    try {
      const res: AxiosResponse = await request({
        axios: axiosInstance,
        url: `${createIncidentUrl}`,
        logger,
        method: createIncidentMethod,
        data: replaceSumDesc(createIncidentJson, summary, description ?? '', labels ?? []),
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
        url: makeIncidentUrl(incidentViewUrl, incidentId, insertedIncident.title),
        pushedDate: getPushedDate(insertedIncident.created),
      };
    } catch (error) {
      throw createServiceError(error, 'Unable to create incident');
    }
  };

  const updateIncident = async ({
    incidentId,
    incident,
  }: UpdateIncidentParams): Promise<ExternalServiceIncidentResponse> => {
    try {
      const res = await request({
        axios: axiosInstance,
        method: updateIncidentMethod,
        url: makeIncidentUrl(updateIncidentUrl, incidentId),
        logger,
        data: replaceSumDesc(
          updateIncidentJson,
          incident.summary,
          incident.description,
          incident.labels
        ),
        configurationUtilities,
      });

      throwIfResponseIsNotValidSpecial({
        res,
      });

      const updatedIncident = await getIncident(incidentId as string);

      return {
        id: incidentId,
        title: updatedIncident.title,
        url: makeIncidentUrl(incidentViewUrl, incidentId, updatedIncident.title),
        pushedDate: getPushedDate(updatedIncident.updated),
      };
    } catch (error) {
      throw createServiceError(error, 'Unable to update incident');
    }
  };

  const createComment = async ({ incidentId, comment }: CreateCommentParams): Promise<unknown> => {
    try {
      const res = await request({
        axios: axiosInstance,
        method: createCommentMethod,
        url: makeIncidentUrl(createCommentUrl, incidentId),
        logger,
        data: replaceComment(createCommentJson, comment.comment),
        configurationUtilities,
      });

      throwIfResponseIsNotValidSpecial({
        res,
      });

      return res;
    } catch (error) {
      throw createServiceError(error, 'Unable to post comment');
    }
  };

  return {
    createComment,
    createIncident,
    getIncident,
    updateIncident,
  };
};
