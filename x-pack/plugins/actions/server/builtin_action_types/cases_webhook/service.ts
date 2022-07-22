/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios, { AxiosResponse } from 'axios';

import { Logger } from '@kbn/core/server';
import { isString } from 'lodash';
import { assertURL, ensureUriAllowed, normalizeURL } from './validators';
import { renderMustacheStringNoEscape } from '../../lib/mustache_renderer';
import {
  createServiceError,
  getObjectValueByKeyAsString,
  getPushedDate,
  stringifyObjValues,
  removeSlash,
  throwDescriptiveErrorIfResponseIsNotValid,
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
  if (
    !getIncidentUrl ||
    !createIncidentUrlConfig ||
    !incidentViewUrl ||
    !updateIncidentUrl ||
    (hasAuth && (!password || !user))
  ) {
    throw Error(`[Action]${i18n.NAME}: Wrong configuration.`);
  }

  const createIncidentUrl = removeSlash(createIncidentUrlConfig);

  const axiosInstance = axios.create({
    ...(hasAuth && isString(secrets.user) && isString(secrets.password)
      ? { auth: { username: secrets.user, password: secrets.password } }
      : {}),
    headers: {
      ['content-type']: 'application/json',
      ...(headers != null ? headers : {}),
    },
  });

  const getIncident = async (id: string): Promise<GetIncidentResponse> => {
    const getUrl = renderMustacheStringNoEscape(getIncidentUrl, {
      external: {
        system: {
          id,
        },
      },
    });
    assertURL(`${getUrl}`);
    ensureUriAllowed(`${getUrl}`, configurationUtilities);
    const normalizedUrl = normalizeURL(`${getUrl}`);
    try {
      const res = await request({
        axios: axiosInstance,
        url: normalizedUrl,
        logger,
        configurationUtilities,
      });

      throwDescriptiveErrorIfResponseIsNotValid({
        res,
        requiredAttributesToBeInTheResponse: [
          getIncidentResponseCreatedDateKey,
          getIncidentResponseExternalTitleKey,
          getIncidentResponseUpdatedDateKey,
        ],
      });

      const title = getObjectValueByKeyAsString(res.data, getIncidentResponseExternalTitleKey)!;
      const createdAt = getObjectValueByKeyAsString(res.data, getIncidentResponseCreatedDateKey)!;
      const updatedAt = getObjectValueByKeyAsString(res.data, getIncidentResponseUpdatedDateKey)!;
      return { id, title, createdAt, updatedAt };
    } catch (error) {
      throw createServiceError(error, `Unable to get case with id ${id}`);
    }
  };

  const createIncident = async ({
    incident,
  }: CreateIncidentParams): Promise<ExternalServiceIncidentResponse> => {
    const { tags, title, description } = incident;
    assertURL(`${createIncidentUrl}`);
    ensureUriAllowed(`${createIncidentUrl}`, configurationUtilities);
    const normalizedUrl = normalizeURL(`${createIncidentUrl}`);
    try {
      const res: AxiosResponse = await request({
        axios: axiosInstance,
        url: normalizedUrl,
        logger,
        method: createIncidentMethod,
        data: renderMustacheStringNoEscape(
          createIncidentJson,
          stringifyObjValues({
            title,
            description: description ?? '',
            tags: tags ?? [],
          })
        ),
        configurationUtilities,
      });

      const { status, statusText, data } = res;

      throwDescriptiveErrorIfResponseIsNotValid({
        res,
        requiredAttributesToBeInTheResponse: [createIncidentResponseKey],
      });
      const externalId = getObjectValueByKeyAsString(data, createIncidentResponseKey)!;
      const insertedIncident = await getIncident(externalId);

      logger.debug(`response from webhook action "${actionId}": [HTTP ${status}] ${statusText}`);

      const viewUrl = renderMustacheStringNoEscape(incidentViewUrl, {
        external: {
          system: {
            id: externalId,
            title: insertedIncident.title,
          },
        },
      });
      assertURL(`${viewUrl}`);
      ensureUriAllowed(`${viewUrl}`, configurationUtilities);
      const normalizedViewUrl = normalizeURL(`${viewUrl}`);
      return {
        id: externalId,
        title: insertedIncident.title,
        url: normalizedViewUrl,
        pushedDate: getPushedDate(insertedIncident.createdAt),
      };
    } catch (error) {
      throw createServiceError(error, 'Unable to create case');
    }
  };

  const updateIncident = async ({
    incidentId,
    incident,
  }: UpdateIncidentParams): Promise<ExternalServiceIncidentResponse> => {
    const updateUrl = renderMustacheStringNoEscape(updateIncidentUrl, {
      external: {
        system: {
          id: incidentId,
        },
      },
    });
    assertURL(`${updateUrl}`);
    ensureUriAllowed(`${updateUrl}`, configurationUtilities);
    const normalizedUrl = normalizeURL(`${updateUrl}`);
    try {
      const { tags, title, description } = incident;
      const res = await request({
        axios: axiosInstance,
        method: updateIncidentMethod,
        url: normalizedUrl,
        logger,
        data: renderMustacheStringNoEscape(updateIncidentJson, {
          ...stringifyObjValues({
            ...(title ? { title } : {}),
            ...(description ? { description } : {}),
            ...(tags ? { tags } : {}),
          }),
          external: {
            system: {
              id: incidentId,
            },
          },
        }),
        configurationUtilities,
      });

      throwDescriptiveErrorIfResponseIsNotValid({
        res,
      });

      const updatedIncident = await getIncident(incidentId as string);
      const viewUrl = renderMustacheStringNoEscape(incidentViewUrl, {
        external: {
          system: {
            id: incidentId,
            title: updatedIncident.title,
          },
        },
      });
      assertURL(`${viewUrl}`);
      ensureUriAllowed(`${viewUrl}`, configurationUtilities);
      const normalizedViewUrl = normalizeURL(`${viewUrl}`);
      return {
        id: incidentId,
        title: updatedIncident.title,
        url: normalizedViewUrl,
        pushedDate: getPushedDate(updatedIncident.updatedAt),
      };
    } catch (error) {
      throw createServiceError(error, `Unable to update case with id ${incidentId}`);
    }
  };

  const createComment = async ({ incidentId, comment }: CreateCommentParams): Promise<unknown> => {
    try {
      if (!createCommentUrl || !createCommentJson) {
        return;
      }
      const commentUrl = renderMustacheStringNoEscape(createCommentUrl, {
        external: {
          system: {
            id: incidentId,
          },
        },
      });
      assertURL(`${commentUrl}`);
      ensureUriAllowed(`${commentUrl}`, configurationUtilities);
      const normalizedUrl = normalizeURL(`${commentUrl}`);
      const res = await request({
        axios: axiosInstance,
        method: createCommentMethod,
        url: normalizedUrl,
        logger,
        data: renderMustacheStringNoEscape(createCommentJson, {
          ...stringifyObjValues({ comment: comment.comment }),
          external: {
            system: {
              id: incidentId,
            },
          },
        }),
        configurationUtilities,
      });

      throwDescriptiveErrorIfResponseIsNotValid({
        res,
      });
    } catch (error) {
      throw createServiceError(error, `Unable to create comment at case with id ${incidentId}`);
    }
  };

  return {
    createComment,
    createIncident,
    getIncident,
    updateIncident,
  };
};
