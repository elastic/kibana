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

      const title = getObjectValueByKey(res.data, getIncidentResponseExternalTitleKey) as string;
      const created = getObjectValueByKey(res.data, getIncidentResponseCreatedDateKey) as string;
      const updated = getObjectValueByKey(res.data, getIncidentResponseUpdatedDateKey) as string;

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
      const incidentId = getObjectValueByKey(data, createIncidentResponseKey) as string;
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

  // const getCapabilities = async () => {
  //   try {
  //     const res = await request({
  //       axios: axiosInstance,
  //       method: 'get',
  //       url: capabilitiesUrl,
  //       logger,
  //       configurationUtilities,
  //     });
  //
  //     throwIfResponseIsNotValid({
  //       res,
  //       requiredAttributesToBeInTheResponse: ['capabilities'],
  //     });
  //
  //     return { ...res.data };
  //   } catch (error) {
  //     throw new Error(
  //       getErrorMessage(
  //         i18n.NAME,
  //         `Unable to get capabilities. Error: ${error.message}. Reason: ${createErrorMessage(
  //           error.response?.data
  //         )}`
  //       )
  //     );
  //   }
  // };
  //
  // const getIssueTypes = async () => {
  //   const capabilitiesResponse = await getCapabilities();
  //   const supportsNewAPI = hasSupportForNewAPI(capabilitiesResponse);
  //   try {
  //     if (!supportsNewAPI) {
  //       const res = await request({
  //         axios: axiosInstance,
  //         method: 'get',
  //         url: getIssueTypesOldAPIURL,
  //         logger,
  //         configurationUtilities,
  //       });
  //
  //       throwIfResponseIsNotValid({
  //         res,
  //       });
  //
  //       const issueTypes = res.data.projects[0]?.issuetypes ?? [];
  //       return normalizeIssueTypes(issueTypes);
  //     } else {
  //       const res = await request({
  //         axios: axiosInstance,
  //         method: 'get',
  //         url: getIssueTypesUrl,
  //         logger,
  //         configurationUtilities,
  //       });
  //
  //       throwIfResponseIsNotValid({
  //         res,
  //       });
  //
  //       const issueTypes = res.data.values;
  //       return normalizeIssueTypes(issueTypes);
  //     }
  //   } catch (error) {
  //     throw new Error(
  //       getErrorMessage(
  //         i18n.NAME,
  //         `Unable to get issue types. Error: ${error.message}. Reason: ${createErrorMessage(
  //           error.response?.data
  //         )}`
  //       )
  //     );
  //   }
  // };
  //
  // const getFieldsByIssueType = async (issueTypeId: string) => {
  //   const capabilitiesResponse = await getCapabilities();
  //   const supportsNewAPI = hasSupportForNewAPI(capabilitiesResponse);
  //   try {
  //     if (!supportsNewAPI) {
  //       const res = await request({
  //         axios: axiosInstance,
  //         method: 'get',
  //         url: createGetIssueTypeFieldsUrl(getIssueTypeFieldsOldAPIURL, issueTypeId),
  //         logger,
  //         configurationUtilities,
  //       });
  //
  //       throwIfResponseIsNotValid({
  //         res,
  //       });
  //
  //       const fields = res.data.projects[0]?.issuetypes[0]?.fields || {};
  //       return normalizeFields(fields);
  //     } else {
  //       const res = await request({
  //         axios: axiosInstance,
  //         method: 'get',
  //         url: createGetIssueTypeFieldsUrl(getIssueTypeFieldsUrl, issueTypeId),
  //         logger,
  //         configurationUtilities,
  //       });
  //
  //       throwIfResponseIsNotValid({
  //         res,
  //       });
  //
  //       const fields = res.data.values.reduce(
  //         (acc: { [x: string]: {} }, value: { fieldId: string }) => ({
  //           ...acc,
  //           [value.fieldId]: { ...value },
  //         }),
  //         {}
  //       );
  //       return normalizeFields(fields);
  //     }
  //   } catch (error) {
  //     throw new Error(
  //       getErrorMessage(
  //         i18n.NAME,
  //         `Unable to get fields. Error: ${error.message}. Reason: ${createErrorMessage(
  //           error.response?.data
  //         )}`
  //       )
  //     );
  //   }
  // };
  //
  // const getFields = async () => {
  //   try {
  //     const issueTypes = await getIssueTypes();
  //     const fieldsPerIssueType = await Promise.all(
  //       issueTypes.map((issueType) => getFieldsByIssueType(issueType.id))
  //     );
  //     return fieldsPerIssueType.reduce((acc: GetCommonFieldsResponse, fieldTypesByIssue) => {
  //       const currentListOfFields = Object.keys(acc);
  //       return currentListOfFields.length === 0
  //         ? fieldTypesByIssue
  //         : currentListOfFields.reduce(
  //             (add: GetCommonFieldsResponse, field) =>
  //               Object.keys(fieldTypesByIssue).includes(field)
  //                 ? { ...add, [field]: acc[field] }
  //                 : add,
  //             {}
  //           );
  //     }, {});
  //   } catch (error) {
  //     // errors that happen here would be thrown in the contained async calls
  //     throw error;
  //   }
  // };
  //
  // const getIssues = async (title: string) => {
  //   const query = `${searchUrl}?jql=${encodeURIComponent(
  //     `project="${projectKey}" and summary ~"${title}"`
  //   )}`;
  //
  //   try {
  //     const res = await request({
  //       axios: axiosInstance,
  //       method: 'get',
  //       url: query,
  //       logger,
  //       configurationUtilities,
  //     });
  //
  //     throwIfResponseIsNotValid({
  //       res,
  //     });
  //
  //     return normalizeSearchResults(res.data?.issues ?? []);
  //   } catch (error) {
  //     throw new Error(
  //       getErrorMessage(
  //         i18n.NAME,
  //         `Unable to get issues. Error: ${error.message}. Reason: ${createErrorMessage(
  //           error.response?.data
  //         )}`
  //       )
  //     );
  //   }
  // };
  //
  // const getIssue = async (id: string) => {
  //   const getIssueUrl = `${createIncidentUrl}/${id}`;
  //   try {
  //     const res = await request({
  //       axios: axiosInstance,
  //       method: 'get',
  //       url: getIssueUrl,
  //       logger,
  //       configurationUtilities,
  //     });
  //
  //     throwIfResponseIsNotValid({
  //       res,
  //     });
  //
  //     return normalizeIssue(res.data ?? {});
  //   } catch (error) {
  //     throw new Error(
  //       getErrorMessage(
  //         i18n.NAME,
  //         `Unable to get issue with id ${id}. Error: ${error.message}. Reason: ${createErrorMessage(
  //           error.response?.data
  //         )}`
  //       )
  //     );
  //   }
  // };

  return {
    // getFields,
    getIncident,
    createIncident,
    // updateIncident,
    // createComment,
    // getCapabilities,
    // getIssueTypes,
    // getFieldsByIssueType,
    // getIssues,
    // getIssue,
  };
};
