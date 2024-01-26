/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios, { AxiosResponse } from 'axios';

import { Logger } from '@kbn/core/server';
import { isString } from 'lodash';
import { renderMustacheStringNoEscape } from '@kbn/actions-plugin/server/lib/mustache_renderer';
import { request } from '@kbn/actions-plugin/server/lib/axios_utils';
import { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import { validateAndNormalizeUrl, validateJson } from './validators';
import {
  createServiceError,
  getObjectValueByKeyAsString,
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
    getIncidentResponseExternalTitleKey,
    getIncidentUrl,
    hasAuth,
    headers,
    viewIncidentUrl,
    updateIncidentJson,
    updateIncidentMethod,
    updateIncidentUrl,
  } = config as CasesWebhookPublicConfigurationType;
  const { password, user } = secrets as CasesWebhookSecretConfigurationType;
  if (
    !getIncidentUrl ||
    !createIncidentUrlConfig ||
    !viewIncidentUrl ||
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
    try {
      const getUrl = renderMustacheStringNoEscape(getIncidentUrl, {
        external: {
          system: {
            id: encodeURIComponent(id),
          },
        },
      });

      const normalizedUrl = validateAndNormalizeUrl(
        `${getUrl}`,
        configurationUtilities,
        'Get case URL'
      );
      const res = await request({
        axios: axiosInstance,
        url: normalizedUrl,
        logger,
        configurationUtilities,
      });

      throwDescriptiveErrorIfResponseIsNotValid({
        res,
        requiredAttributesToBeInTheResponse: [getIncidentResponseExternalTitleKey],
      });

      const title = getObjectValueByKeyAsString(res.data, getIncidentResponseExternalTitleKey)!;
      return { id, title };
    } catch (error) {
      throw createServiceError(error, `Unable to get case with id ${id}`);
    }
  };

  const createIncident = async ({
    incident,
  }: CreateIncidentParams): Promise<ExternalServiceIncidentResponse> => {
    try {
      const { description, id, severity, status: incidentStatus, tags, title } = incident;
      const normalizedUrl = validateAndNormalizeUrl(
        `${createIncidentUrl}`,
        configurationUtilities,
        'Create case URL'
      );
      const json = renderMustacheStringNoEscape(
        createIncidentJson,
        stringifyObjValues({
          description: description ?? '',
          id: id ?? '',
          severity: severity ?? '',
          status: incidentStatus ?? '',
          tags: tags ?? [],
          title,
        })
      );

      validateJson(json, 'Create case JSON body');
      const res: AxiosResponse = await request({
        axios: axiosInstance,
        url: normalizedUrl,
        logger,
        method: createIncidentMethod,
        data: json,
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

      const viewUrl = renderMustacheStringNoEscape(viewIncidentUrl, {
        external: {
          system: {
            id: encodeURIComponent(externalId),
            title: encodeURIComponent(insertedIncident.title),
          },
        },
      });
      const normalizedViewUrl = validateAndNormalizeUrl(
        `${viewUrl}`,
        configurationUtilities,
        'View case URL'
      );
      return {
        id: externalId,
        title: insertedIncident.title,
        url: normalizedViewUrl,
        pushedDate: new Date().toISOString(),
      };
    } catch (error) {
      throw createServiceError(error, 'Unable to create case');
    }
  };

  const updateIncident = async ({
    incidentId,
    incident,
  }: UpdateIncidentParams): Promise<ExternalServiceIncidentResponse> => {
    try {
      const updateUrl = renderMustacheStringNoEscape(updateIncidentUrl, {
        external: {
          system: {
            id: encodeURIComponent(incidentId),
          },
        },
      });

      const normalizedUrl = validateAndNormalizeUrl(
        `${updateUrl}`,
        configurationUtilities,
        'Update case URL'
      );

      const { description, id, severity, status: incidentStatus, tags, title } = incident;

      const json = renderMustacheStringNoEscape(updateIncidentJson, {
        ...stringifyObjValues({
          description: description ?? '',
          id: id ?? '',
          severity: severity ?? '',
          status: incidentStatus ?? '',
          tags: tags ?? [],
          title,
        }),
        external: {
          system: {
            id: JSON.stringify(incidentId),
          },
        },
      });

      validateJson(json, 'Update case JSON body');

      const res = await request({
        axios: axiosInstance,
        method: updateIncidentMethod,
        url: normalizedUrl,
        logger,
        data: json,
        configurationUtilities,
      });

      throwDescriptiveErrorIfResponseIsNotValid({
        res,
      });

      const updatedIncident = await getIncident(incidentId as string);

      const viewUrl = renderMustacheStringNoEscape(viewIncidentUrl, {
        external: {
          system: {
            id: encodeURIComponent(incidentId),
            title: encodeURIComponent(updatedIncident.title),
          },
        },
      });

      const normalizedViewUrl = validateAndNormalizeUrl(
        `${viewUrl}`,
        configurationUtilities,
        'View case URL'
      );

      return {
        id: incidentId,
        title: updatedIncident.title,
        url: normalizedViewUrl,
        pushedDate: new Date().toISOString(),
      };
    } catch (error) {
      throw createServiceError(error, `Unable to update case with id ${incidentId}`);
    }
  };

  const createComment = async ({ incidentId, comment }: CreateCommentParams): Promise<unknown> => {
    try {
      if (!createCommentUrl || !createCommentJson || !createCommentMethod) {
        return;
      }

      const commentUrl = renderMustacheStringNoEscape(createCommentUrl, {
        external: {
          system: {
            id: encodeURIComponent(incidentId),
          },
        },
      });

      const normalizedUrl = validateAndNormalizeUrl(
        `${commentUrl}`,
        configurationUtilities,
        'Create comment URL'
      );

      const json = renderMustacheStringNoEscape(createCommentJson, {
        ...stringifyObjValues({ comment: comment.comment }),
        external: {
          system: {
            id: JSON.stringify(incidentId),
          },
        },
      });

      validateJson(json, 'Create comment JSON body');

      const res = await request({
        axios: axiosInstance,
        method: createCommentMethod,
        url: normalizedUrl,
        logger,
        data: json,
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
