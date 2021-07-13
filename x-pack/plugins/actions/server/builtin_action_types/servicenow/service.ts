/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios, { AxiosResponse } from 'axios';

import {
  ExternalServiceCredentials,
  ExternalService,
  ExternalServiceParams,
  ImportSetApiResponse,
  ImportSetApiResponseError,
  ServiceNowIncident,
} from './types';

import * as i18n from './translations';
import { Logger } from '../../../../../../src/core/server';
import {
  ServiceNowPublicConfigurationType,
  ServiceNowSecretConfigurationType,
  ResponseError,
} from './types';
import { request, getErrorMessage, addTimeZoneToDate, patch } from '../lib/axios_utils';
import { ActionsConfigurationUtilities } from '../../actions_config';

const API_VERSION = 'v2';
const SYS_DICTIONARY = `api/now/${API_VERSION}/table/sys_dictionary`;
const IMPORTATION_SET_TABLE = 'x_463134_elastic_import_set_web_service';
const FIELD_PREFIX = 'u_';

const prefixFields = (incident: ExternalServiceParams['incident']) =>
  Object.entries(incident).reduce(
    (acc, [key, value]) => ({ ...acc, [`${FIELD_PREFIX}${key}`]: value }),
    {}
  );

export const createExternalService = (
  table: string,
  { config, secrets }: ExternalServiceCredentials,
  logger: Logger,
  configurationUtilities: ActionsConfigurationUtilities
): ExternalService => {
  const { apiUrl: url } = config as ServiceNowPublicConfigurationType;
  const { username, password } = secrets as ServiceNowSecretConfigurationType;

  if (!url || !username || !password) {
    throw Error(`[Action]${i18n.SERVICENOW}: Wrong configuration.`);
  }

  const urlWithoutTrailingSlash = url.endsWith('/') ? url.slice(0, -1) : url;
  const importSetTableUrl = `${urlWithoutTrailingSlash}/api/now/import/${IMPORTATION_SET_TABLE}`;
  const incidentUrl = `${urlWithoutTrailingSlash}/api/now/${API_VERSION}/table/${table}`;
  const fieldsUrl = `${urlWithoutTrailingSlash}/${SYS_DICTIONARY}?sysparm_query=name=task^ORname=${table}^internal_type=string&active=true&array=false&read_only=false&sysparm_fields=max_length,element,column_label,mandatory`;
  const choicesUrl = `${urlWithoutTrailingSlash}/api/now/${API_VERSION}/table/sys_choice`;
  const axiosInstance = axios.create({
    auth: { username, password },
  });

  const getIncidentViewURL = (id: string) => {
    // Based on: https://docs.servicenow.com/bundle/orlando-platform-user-interface/page/use/navigation/reference/r_NavigatingByURLExamples.html
    return `${urlWithoutTrailingSlash}/nav_to.do?uri=${table}.do?sys_id=${id}`;
  };

  const getChoicesURL = (fields: string[]) => {
    const elements = fields
      .slice(1)
      .reduce((acc, field) => `${acc}^ORelement=${field}`, `element=${fields[0]}`);

    return `${choicesUrl}?sysparm_query=name=task^ORname=${table}^${elements}&sysparm_fields=label,value,dependent_value,element`;
  };

  const checkInstance = (res: AxiosResponse) => {
    if ((res.status >= 200 || res.status < 400) && res.data.result == null) {
      throw new Error(
        `There is an issue with your Service Now Instance. Please check ${
          res.request?.connection?.servername ?? ''
        }.`
      );
    }
  };

  const createErrorMessage = (errorResponse: ResponseError): string => {
    if (errorResponse == null) {
      return '';
    }

    const { error } = errorResponse;
    return error != null ? `${error?.message}: ${error?.detail}` : '';
  };

  const isImportSetApiResponseAnError = (
    data: ImportSetApiResponse['result'][0]
  ): data is ImportSetApiResponseError['result'][0] => data.status === 'error';

  const throwIfImportSetApiResponseIsAnError = (res: ImportSetApiResponse) => {
    if (res.result.length === 0) {
      throw new Error('Unexpected result');
    }

    const data = res.result[0];

    // Create ResponseError message?
    if (isImportSetApiResponseAnError(data)) {
      throw new Error(data.error_message);
    }
  };

  const getIncident = async (id: string): Promise<ServiceNowIncident> => {
    try {
      const res = await request({
        axios: axiosInstance,
        url: `${incidentUrl}/${id}`,
        logger,
        configurationUtilities,
      });

      checkInstance(res);

      return { ...res.data.result };
    } catch (error) {
      throw new Error(
        getErrorMessage(
          i18n.SERVICENOW,
          `Unable to get incident with id ${id}. Error: ${
            error.message
          } Reason: ${createErrorMessage(error.response?.data)}`
        )
      );
    }
  };

  const findIncidents = async (params?: Record<string, string>) => {
    try {
      const res = await request({
        axios: axiosInstance,
        url: incidentUrl,
        logger,
        params,
        configurationUtilities,
      });
      checkInstance(res);
      return res.data.result.length > 0 ? { ...res.data.result } : undefined;
    } catch (error) {
      throw new Error(
        getErrorMessage(
          i18n.SERVICENOW,
          `Unable to find incidents by query. Error: ${error.message} Reason: ${createErrorMessage(
            error.response?.data
          )}`
        )
      );
    }
  };

  const createIncident = async ({ incident }: ExternalServiceParams) => {
    try {
      const res = await request({
        axios: axiosInstance,
        url: importSetTableUrl,
        logger,
        method: 'post',
        data: prefixFields(incident),
        configurationUtilities,
      });

      checkInstance(res);
      throwIfImportSetApiResponseIsAnError(res.data);
      const insertedIncident = await getIncident(res.data.result[0].sys_id);

      return {
        title: insertedIncident.number,
        id: insertedIncident.sys_id,
        pushedDate: new Date(addTimeZoneToDate(insertedIncident.sys_created_on)).toISOString(),
        url: getIncidentViewURL(insertedIncident.sys_id),
      };
    } catch (error) {
      throw new Error(
        getErrorMessage(
          i18n.SERVICENOW,
          `Unable to create incident. Error: ${error.message} Reason: ${createErrorMessage(
            error.response?.data
          )}`
        )
      );
    }
  };

  const updateIncident = async ({ incidentId, incident }: ExternalServiceParams) => {
    try {
      const res = await request({
        axios: axiosInstance,
        url: importSetTableUrl,
        method: 'post',
        logger,
        data: { ...prefixFields(incident), u_incident_id: incidentId },
        configurationUtilities,
      });

      checkInstance(res);
      throwIfImportSetApiResponseIsAnError(res.data);
      const insertedIncident = await getIncident(res.data.result[0].sys_id);

      return {
        title: insertedIncident.number,
        id: insertedIncident.sys_id,
        pushedDate: new Date(addTimeZoneToDate(insertedIncident.sys_updated_on)).toISOString(),
        url: getIncidentViewURL(insertedIncident.sys_id),
      };
    } catch (error) {
      throw new Error(
        getErrorMessage(
          i18n.SERVICENOW,
          `Unable to update incident with id ${incidentId}. Error: ${
            error.message
          } Reason: ${createErrorMessage(error.response?.data)}`
        )
      );
    }
  };

  const getFields = async () => {
    try {
      const res = await request({
        axios: axiosInstance,
        url: fieldsUrl,
        logger,
        configurationUtilities,
      });

      checkInstance(res);

      return res.data.result.length > 0 ? res.data.result : [];
    } catch (error) {
      throw new Error(
        getErrorMessage(
          i18n.SERVICENOW,
          `Unable to get fields. Error: ${error.message} Reason: ${createErrorMessage(
            error.response?.data
          )}`
        )
      );
    }
  };

  const getChoices = async (fields: string[]) => {
    try {
      const res = await request({
        axios: axiosInstance,
        url: getChoicesURL(fields),
        logger,
        configurationUtilities,
      });
      checkInstance(res);
      return res.data.result;
    } catch (error) {
      throw new Error(
        getErrorMessage(
          i18n.SERVICENOW,
          `Unable to get choices. Error: ${error.message} Reason: ${createErrorMessage(
            error.response?.data
          )}`
        )
      );
    }
  };

  return {
    createIncident,
    findIncidents,
    getFields,
    getIncident,
    updateIncident,
    getChoices,
  };
};
