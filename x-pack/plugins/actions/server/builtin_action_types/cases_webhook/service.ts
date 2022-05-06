/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios, { AxiosError, AxiosResponse } from 'axios';

import { Logger } from '@kbn/core/server';
import { pipe } from 'fp-ts/pipeable';
import { getOrElse, map } from 'fp-ts/Option';
import { ActionTypeExecutorResult } from '../../../common';
import { isOk, promiseResult, Result } from '../lib/result_type';
import {
  CreateIncidentParams,
  ExternalServiceCredentials,
  ResponseError,
  ExternalServiceIncidentResponse,
  ExternalService,
  CasesWebhookPublicConfigurationType,
  CasesWebhookSecretConfigurationType,
} from './types';

import * as i18n from './translations';
import { request, getErrorMessage, throwIfResponseIsNotValid } from '../lib/axios_utils';
import { ActionsConfigurationUtilities } from '../../actions_config';
import { getRetryAfterIntervalFromHeaders } from '../lib/http_rersponse_retry_header';

const VERSION = '2';
const BASE_URL = `rest/api/${VERSION}`;

const VIEW_INCIDENT_URL = `browse`;

export const createExternalService = (
  actionId: string,
  { config, secrets }: ExternalServiceCredentials,
  logger: Logger,
  configurationUtilities: ActionsConfigurationUtilities
): ExternalService => {
  const { url, incident } = config as CasesWebhookPublicConfigurationType;
  const { password, user } = secrets as CasesWebhookSecretConfigurationType;
  console.log('eh eh eh', {
    bool: !url || !password || !user,
    config,
    url,
    password,
    user,
  });
  if (!url || !password || !user) {
    throw Error(`[Action]${i18n.NAME}: Wrong configuration.`);
  }

  const incidentUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  // const incidentUrl = `${urlWithoutTrailingSlash}/${BASE_URL}/issue`;

  const axiosInstance = axios.create({
    auth: { username: user, password },
  });
  //
  const getIncidentViewURL = (key: string) => {
    return `https://siem-kibana.atlassian.net/browse/${key}`;
  };
  const createErrorMessage = (errorResponse: ResponseError | null | undefined): string => {
    if (errorResponse == null) {
      return 'unknown: errorResponse was null';
    }

    const { errorMessages, errors } = errorResponse;

    if (errors == null) {
      return 'unknown: errorResponse.errors was null';
    }

    if (Array.isArray(errorMessages) && errorMessages.length > 0) {
      return `${errorMessages.join(', ')}`;
    }

    return Object.entries(errors).reduce((errorMessage, [, value]) => {
      const msg = errorMessage.length > 0 ? `${errorMessage} ${value}` : value;
      return msg;
    }, '');
  };
  //
  // const hasSupportForNewAPI = (capabilities: { capabilities?: {} }) =>
  //   createMetaCapabilities.every((c) => Object.keys(capabilities?.capabilities ?? {}).includes(c));
  //
  // const normalizeIssueTypes = (issueTypes: Array<{ id: string; name: string }>) =>
  //   issueTypes.map((type) => ({ id: type.id, name: type.name }));
  //
  // const normalizeFields = (fields: {
  //   [key: string]: {
  //     allowedValues?: Array<{}>;
  //     defaultValue?: {};
  //     name: string;
  //     required: boolean;
  //     schema: FieldSchema;
  //   };
  // }) =>
  //   Object.keys(fields ?? {}).reduce(
  //     (fieldsAcc, fieldKey) => ({
  //       ...fieldsAcc,
  //       [fieldKey]: {
  //         required: fields[fieldKey]?.required,
  //         allowedValues: fields[fieldKey]?.allowedValues ?? [],
  //         defaultValue: fields[fieldKey]?.defaultValue ?? {},
  //         schema: fields[fieldKey]?.schema,
  //         name: fields[fieldKey]?.name,
  //       },
  //     }),
  //     {}
  //   );
  //
  // const normalizeSearchResults = (
  //   issues: Array<{ id: string; key: string; fields: { summary: string } }>
  // ) =>
  //   issues.map((issue) => ({ id: issue.id, key: issue.key, title: issue.fields?.summary ?? null }));
  //
  // const normalizeIssue = (issue: { id: string; key: string; fields: { summary: string } }) => ({
  //   id: issue.id,
  //   key: issue.key,
  //   title: issue.fields?.summary ?? null,
  // });
  //
  const getIncident = async (id: string) => {
    try {
      const res = await request({
        axios: axiosInstance,
        url: `${incidentUrl}/${id}`,
        logger,
        configurationUtilities,
      });

      throwIfResponseIsNotValid({
        res,
        requiredAttributesToBeInTheResponse: ['id', 'key'],
      });

      const { fields, id: incidentId, key } = res.data;

      return { id: incidentId, key, created: fields.created, updated: fields.updated, ...fields };
    } catch (error) {
      throw new Error(
        getErrorMessage(
          i18n.NAME,
          `Unable to get incident with id ${id}. Error: ${
            error.message
          } Reason: ${createErrorMessage(error.response?.data)}`
        )
      );
    }
  };

  const replaceSumDesc = (sum: string, desc: string) => {
    let str = incident; // incident is stringified object
    str = str.replace('$SUM', sum);
    str = str.replace('$DESC', desc);
    return JSON.parse(str);
  };
  // Action Executor Result w/ internationalisation
  function successResult(actionId: string, data: unknown): ActionTypeExecutorResult<unknown> {
    return { status: 'ok', data, actionId };
  }
  const createIncident = async ({
    summary,
    description,
  }: CreateIncidentParams): Promise<unknown> => {
    const data = replaceSumDesc(summary, description);
    console.log('cases webhook args!!', {
      axios: axiosInstance,
      url: `${incidentUrl}`,
      logger,
      method: 'post',
      data,
      configurationUtilities,
    });
    try {
      const result: Result<AxiosResponse, AxiosError> = await promiseResult(
        request({
          axios: axiosInstance,
          url: `${incidentUrl}`,
          logger,
          method: 'post',
          data,
          configurationUtilities,
        })
      );
      console.log('it happened!!!', result);

      if (isOk(result)) {
        const {
          value: { status, statusText, data: data2 },
        } = result;
        console.log('DATA', data2);
        logger.debug(`response from webhook action "${actionId}": [HTTP ${status}] ${statusText}`);

        return successResult(actionId, data);
      } else {
        const { error } = result;
        if (error.response) {
          const {
            status,
            statusText,
            headers: responseHeaders,
            data: { message: responseMessage },
          } = error.response;
          const responseMessageAsSuffix = responseMessage ? `: ${responseMessage}` : '';
          const message = `[${status}] ${statusText}${responseMessageAsSuffix}`;
          logger.error(`error on ${actionId} webhook event: ${message}`);
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          // special handling for 5xx
          return { actionId, message };
        }
      }
    } catch (error) {
      console.log('ERROR', error.response);
      throw new Error(
        getErrorMessage(
          i18n.NAME,
          `Unable to create incident. Error: ${error.message}. Reason: ${createErrorMessage(
            error.response?.data
          )}`
        )
      );
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
  //       url: `${incidentUrl}/${incidentId}`,
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
  //   const getIssueUrl = `${incidentUrl}/${id}`;
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
    // getIncident,
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
