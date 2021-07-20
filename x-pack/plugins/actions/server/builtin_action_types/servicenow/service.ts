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
  ExternalServiceParamsCreate,
  ExternalServiceParamsUpdate,
  ImportSetApiResponse,
  ImportSetApiResponseError,
  ServiceNowIncident,
  Incident,
} from './types';

import * as i18n from './translations';
import { Logger } from '../../../../../../src/core/server';
import {
  ServiceNowPublicConfigurationType,
  ServiceNowSecretConfigurationType,
  ResponseError,
} from './types';
import { request, getErrorMessage, addTimeZoneToDate } from '../lib/axios_utils';
import { ActionsConfigurationUtilities } from '../../actions_config';
import { ServiceNowSIRActionTypeId } from './config';

const SYS_DICTIONARY = `api/now/table/sys_dictionary`;
// TODO: Change it to production when the app is ready
const IMPORTATION_SET_TABLE = 'x_463134_elastic_import_set_web_service';
const FIELD_PREFIX = 'u_';

const prepareIncident = (useOldApi: boolean, incident: Incident): Incident =>
  useOldApi
    ? incident
    : Object.entries(incident).reduce(
        (acc, [key, value]) => ({ ...acc, [`${FIELD_PREFIX}${key}`]: value }),
        {} as Incident
      );

export const createExternalService = (
  table: string,
  { config, secrets }: ExternalServiceCredentials,
  logger: Logger,
  configurationUtilities: ActionsConfigurationUtilities,
  actionTypeId: string
): ExternalService => {
  const { apiUrl: url, isLegacy } = config as ServiceNowPublicConfigurationType;
  const { username, password } = secrets as ServiceNowSecretConfigurationType;

  if (!url || !username || !password) {
    throw Error(`[Action]${i18n.SERVICENOW}: Wrong configuration.`);
  }

  const urlWithoutTrailingSlash = url.endsWith('/') ? url.slice(0, -1) : url;
  const importSetTableUrl = `${urlWithoutTrailingSlash}/api/now/import/${IMPORTATION_SET_TABLE}`;
  const tableApiIncidentUrl = `${urlWithoutTrailingSlash}/api/now/table/${table}`;
  const fieldsUrl = `${urlWithoutTrailingSlash}/${SYS_DICTIONARY}?sysparm_query=name=task^ORname=${table}^internal_type=string&active=true&array=false&read_only=false&sysparm_fields=max_length,element,column_label,mandatory`;
  const choicesUrl = `${urlWithoutTrailingSlash}/api/now/table/sys_choice`;

  const axiosInstance = axios.create({
    auth: { username, password },
  });

  // TODO: Remove ServiceNow SIR check when there is a SN Store app for SIR.
  const useOldApi = isLegacy || actionTypeId === ServiceNowSIRActionTypeId;

  const getCreateIncidentUrl = () => (useOldApi ? tableApiIncidentUrl : importSetTableUrl);
  const getUpdateIncidentUrl = (incidentId: string) =>
    useOldApi ? `${tableApiIncidentUrl}/${incidentId}` : importSetTableUrl;

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
        url: `${tableApiIncidentUrl}/${id}`,
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
        url: tableApiIncidentUrl,
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

  const createIncident = async ({ incident }: ExternalServiceParamsCreate) => {
    try {
      const res = await request({
        axios: axiosInstance,
        url: getCreateIncidentUrl(),
        logger,
        method: 'post',
        data: prepareIncident(useOldApi, incident),
        configurationUtilities,
      });

      checkInstance(res);

      if (!useOldApi) {
        throwIfImportSetApiResponseIsAnError(res.data);
      }

      const incidentId = useOldApi ? res.data.result.sys_id : res.data.result[0].sys_id;
      const insertedIncident = await getIncident(incidentId);

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

  const updateIncident = async ({ incidentId, incident }: ExternalServiceParamsUpdate) => {
    try {
      const res = await request({
        axios: axiosInstance,
        url: getUpdateIncidentUrl(incidentId),
        // Import Set API supports only POST.
        method: useOldApi ? 'patch' : 'post',
        logger,
        data: {
          ...prepareIncident(useOldApi, incident),
          // u_incident_id is used to update the incident when using the Import Set API.
          ...(useOldApi ? {} : { u_incident_id: incidentId }),
        },
        configurationUtilities,
      });

      checkInstance(res);

      if (!useOldApi) {
        throwIfImportSetApiResponseIsAnError(res.data);
      }

      const id = useOldApi ? res.data.result.sys_id : res.data.result[0].sys_id;
      const updatedIncident = await getIncident(id);

      return {
        title: updatedIncident.number,
        id: updatedIncident.sys_id,
        pushedDate: new Date(addTimeZoneToDate(updatedIncident.sys_updated_on)).toISOString(),
        url: getIncidentViewURL(updatedIncident.sys_id),
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
