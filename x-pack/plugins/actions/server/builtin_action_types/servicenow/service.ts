/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios, { AxiosResponse } from 'axios';

import { Logger } from '@kbn/core/server';
import {
  ExternalServiceCredentials,
  ExternalService,
  ExternalServiceParamsCreate,
  ExternalServiceParamsUpdate,
  ImportSetApiResponse,
  ImportSetApiResponseError,
  ServiceNowIncident,
  GetApplicationInfoResponse,
  SNProductsConfigValue,
  ServiceFactory,
} from './types';

import * as i18n from './translations';
import { ServiceNowPublicConfigurationType, ServiceNowSecretConfigurationType } from './types';
import { request } from '../lib/axios_utils';
import { ActionsConfigurationUtilities } from '../../actions_config';
import { createServiceError, getPushedDate, prepareIncident } from './utils';

export const SYS_DICTIONARY_ENDPOINT = `api/now/table/sys_dictionary`;

export const createExternalService: ServiceFactory = (
  { config, secrets }: ExternalServiceCredentials,
  logger: Logger,
  configurationUtilities: ActionsConfigurationUtilities,
  { table, importSetTable, useImportAPI, appScope }: SNProductsConfigValue
): ExternalService => {
  const { apiUrl: url, usesTableApi: usesTableApiConfigValue } =
    config as ServiceNowPublicConfigurationType;
  const { username, password } = secrets as ServiceNowSecretConfigurationType;

  if (!url || !username || !password) {
    throw Error(`[Action]${i18n.SERVICENOW}: Wrong configuration.`);
  }

  const urlWithoutTrailingSlash = url.endsWith('/') ? url.slice(0, -1) : url;
  const importSetTableUrl = `${urlWithoutTrailingSlash}/api/now/import/${importSetTable}`;
  const tableApiIncidentUrl = `${urlWithoutTrailingSlash}/api/now/v2/table/${table}`;
  const fieldsUrl = `${urlWithoutTrailingSlash}/${SYS_DICTIONARY_ENDPOINT}?sysparm_query=name=task^ORname=${table}^internal_type=string&active=true&array=false&read_only=false&sysparm_fields=max_length,element,column_label,mandatory`;
  const choicesUrl = `${urlWithoutTrailingSlash}/api/now/table/sys_choice`;
  /**
   * Need to be set the same at:
   * x-pack/plugins/triggers_actions_ui/public/application/components/builtin_action_types/servicenow/api.ts
   */
  const getVersionUrl = () => `${urlWithoutTrailingSlash}/api/${appScope}/elastic_api/health`;

  const axiosInstance = axios.create({
    auth: { username, password },
  });

  const useTableApi = !useImportAPI || usesTableApiConfigValue;

  const getCreateIncidentUrl = () => (useTableApi ? tableApiIncidentUrl : importSetTableUrl);
  const getUpdateIncidentUrl = (incidentId: string) =>
    useTableApi ? `${tableApiIncidentUrl}/${incidentId}` : importSetTableUrl;

  const getIncidentViewURL = (id: string) => {
    // Based on: https://docs.servicenow.com/bundle/orlando-platform-user-interface/page/use/navigation/reference/r_NavigatingByURLExamples.html
    return `${urlWithoutTrailingSlash}/nav_to.do?uri=${table}.do?sys_id=${id}`;
  };

  const getChoicesURL = (fields: string[]) => {
    const elements = fields
      .slice(1)
      .reduce((acc, field) => `${acc}^ORelement=${field}`, `element=${fields[0]}`);

    return `${choicesUrl}?sysparm_query=name=task^ORname=${table}^${elements}^language=en&sysparm_fields=label,value,dependent_value,element`;
  };

  const checkInstance = (res: AxiosResponse) => {
    if (res.status >= 200 && res.status < 400 && res.data.result == null) {
      throw new Error(
        `There is an issue with your Service Now Instance. Please check ${
          res.request?.connection?.servername ?? ''
        }.`
      );
    }
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

  /**
   * Gets the Elastic SN Application information including the current version.
   * It should not be used on connectors that use the old API.
   */
  const getApplicationInformation = async (): Promise<GetApplicationInfoResponse> => {
    try {
      const res = await request({
        axios: axiosInstance,
        url: getVersionUrl(),
        logger,
        configurationUtilities,
        method: 'get',
      });

      checkInstance(res);

      return { ...res.data.result };
    } catch (error) {
      throw createServiceError(error, 'Unable to get application version');
    }
  };

  const logApplicationInfo = (scope: string, version: string) =>
    logger.debug(`Create incident: Application scope: ${scope}: Application version${version}`);

  const checkIfApplicationIsInstalled = async () => {
    if (!useTableApi) {
      const { version, scope } = await getApplicationInformation();
      logApplicationInfo(scope, version);
    }
  };

  const getIncident = async (id: string): Promise<ServiceNowIncident> => {
    try {
      const res = await request({
        axios: axiosInstance,
        url: `${tableApiIncidentUrl}/${id}`,
        logger,
        configurationUtilities,
        method: 'get',
      });

      checkInstance(res);

      return { ...res.data.result };
    } catch (error) {
      throw createServiceError(error, `Unable to get incident with id ${id}`);
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
      throw createServiceError(error, 'Unable to find incidents by query');
    }
  };

  const getUrl = () => urlWithoutTrailingSlash;

  const createIncident = async ({ incident }: ExternalServiceParamsCreate) => {
    try {
      await checkIfApplicationIsInstalled();

      const res = await request({
        axios: axiosInstance,
        url: getCreateIncidentUrl(),
        logger,
        method: 'post',
        data: prepareIncident(useTableApi, incident),
        configurationUtilities,
      });

      checkInstance(res);

      if (!useTableApi) {
        throwIfImportSetApiResponseIsAnError(res.data);
      }

      const incidentId = useTableApi ? res.data.result.sys_id : res.data.result[0].sys_id;
      const insertedIncident = await getIncident(incidentId);

      return {
        title: insertedIncident.number,
        id: insertedIncident.sys_id,
        pushedDate: getPushedDate(insertedIncident.sys_created_on),
        url: getIncidentViewURL(insertedIncident.sys_id),
      };
    } catch (error) {
      throw createServiceError(error, 'Unable to create incident');
    }
  };

  const updateIncident = async ({ incidentId, incident }: ExternalServiceParamsUpdate) => {
    try {
      await checkIfApplicationIsInstalled();

      const res = await request({
        axios: axiosInstance,
        url: getUpdateIncidentUrl(incidentId),
        // Import Set API supports only POST.
        method: useTableApi ? 'patch' : 'post',
        logger,
        data: {
          ...prepareIncident(useTableApi, incident),
          // elastic_incident_id is used to update the incident when using the Import Set API.
          ...(useTableApi ? {} : { elastic_incident_id: incidentId }),
        },
        configurationUtilities,
      });

      checkInstance(res);

      if (!useTableApi) {
        throwIfImportSetApiResponseIsAnError(res.data);
      }

      const id = useTableApi ? res.data.result.sys_id : res.data.result[0].sys_id;
      const updatedIncident = await getIncident(id);

      return {
        title: updatedIncident.number,
        id: updatedIncident.sys_id,
        pushedDate: getPushedDate(updatedIncident.sys_updated_on),
        url: getIncidentViewURL(updatedIncident.sys_id),
      };
    } catch (error) {
      throw createServiceError(error, `Unable to update incident with id ${incidentId}`);
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
      throw createServiceError(error, 'Unable to get fields');
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
      throw createServiceError(error, 'Unable to get choices');
    }
  };

  return {
    createIncident,
    findIncidents,
    getFields,
    getIncident,
    updateIncident,
    getChoices,
    getUrl,
    checkInstance,
    getApplicationInformation,
    checkIfApplicationIsInstalled,
  };
};
