/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios, { AxiosResponse } from 'axios';

import { Logger } from '@kbn/core/server';
import { isString } from 'lodash';
import { renderMustacheStringInJson } from '../../lib/mustache_renderer';
import {
  createServiceError,
  getObjectValueByKey,
  getPushedDate,
  makeIncidentUrl,
  removeSlash,
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
    hasAuth,
    headers,
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
    ...(hasAuth && isString(secrets.user) && isString(secrets.password)
      ? { auth: { username: secrets.user, password: secrets.password } }
      : {}),
    ...(headers != null ? { headers } : {}),
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

  const makeCaseStringy = (properties: Record<string, string | string[]>) => ({
    case: Object.entries(properties).map(([key, value]) => ({ [key]: JSON.stringify(value) })),
  });

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
        data: renderMustacheStringInJson(
          createIncidentJson,
          makeCaseStringy({
            title: summary,
            description: description ?? '',
            tags: labels ?? [],
          })
        ),
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
      const { labels, summary, description } = incident;

      const res = await request({
        axios: axiosInstance,
        method: updateIncidentMethod,
        url: makeIncidentUrl(updateIncidentUrl, incidentId),
        logger,
        data: renderMustacheStringInJson(
          updateIncidentJson,
          makeCaseStringy({
            ...(summary ? { title: summary } : {}),
            ...(description ? { title: description } : {}),
            ...(labels ? { tags: labels } : {}),
          })
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
        data: renderMustacheStringInJson(
          createCommentJson,
          makeCaseStringy({ comment: comment.comment })
        ),
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
