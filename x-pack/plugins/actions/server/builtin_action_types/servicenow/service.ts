/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios, { AxiosResponse } from 'axios';

import { ExternalServiceCredentials, ExternalService, ExternalServiceParams } from './types';

import * as i18n from './translations';
import { Logger } from '../../../../../../src/core/server';
import { ServiceNowPublicConfigurationType, ServiceNowSecretConfigurationType } from './types';
import { request, getErrorMessage, addTimeZoneToDate, patch } from '../lib/axios_utils';
import { ActionsConfigurationUtilities } from '../../actions_config';

const API_VERSION = 'v2';
const INCIDENT_URL = `api/now/${API_VERSION}/table/incident`;
const SYS_DICTIONARY = `api/now/${API_VERSION}/table/sys_dictionary`;

// Based on: https://docs.servicenow.com/bundle/orlando-platform-user-interface/page/use/navigation/reference/r_NavigatingByURLExamples.html
const VIEW_INCIDENT_URL = `nav_to.do?uri=incident.do?sys_id=`;

export const createExternalService = (
  { config, secrets }: ExternalServiceCredentials,
  logger: Logger,
  configurationUtilities: ActionsConfigurationUtilities
): ExternalService => {
  const { apiUrl: url } = config as ServiceNowPublicConfigurationType;
  const { username, password } = secrets as ServiceNowSecretConfigurationType;

  if (!url || !username || !password) {
    throw Error(`[Action]${i18n.NAME}: Wrong configuration.`);
  }

  const urlWithoutTrailingSlash = url.endsWith('/') ? url.slice(0, -1) : url;
  const incidentUrl = `${urlWithoutTrailingSlash}/${INCIDENT_URL}`;
  const fieldsUrl = `${urlWithoutTrailingSlash}/${SYS_DICTIONARY}?sysparm_query=name=task^internal_type=string&active=true&array=false&read_only=false&sysparm_fields=max_length,element,column_label,mandatory`;
  const axiosInstance = axios.create({
    auth: { username, password },
  });

  const getIncidentViewURL = (id: string) => {
    return `${urlWithoutTrailingSlash}/${VIEW_INCIDENT_URL}${id}`;
  };

  const checkInstance = (res: AxiosResponse) => {
    if (res.status === 200 && res.data.result == null) {
      throw new Error(
        `There is an issue with your Service Now Instance. Please check ${res.request.connection.servername}`
      );
    }
  };

  const getIncident = async (id: string) => {
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
        getErrorMessage(i18n.NAME, `Unable to get incident with id ${id}. Error: ${error.message}`)
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
        getErrorMessage(i18n.NAME, `Unable to find incidents by query. Error: ${error.message}`)
      );
    }
  };

  const createIncident = async ({ incident }: ExternalServiceParams) => {
    try {
      const res = await request({
        axios: axiosInstance,
        url: `${incidentUrl}`,
        logger,
        method: 'post',
        data: { ...(incident as Record<string, unknown>) },
        configurationUtilities,
      });
      checkInstance(res);
      return {
        title: res.data.result.number,
        id: res.data.result.sys_id,
        pushedDate: new Date(addTimeZoneToDate(res.data.result.sys_created_on)).toISOString(),
        url: getIncidentViewURL(res.data.result.sys_id),
      };
    } catch (error) {
      throw new Error(
        getErrorMessage(i18n.NAME, `Unable to create incident. Error: ${error.message}`)
      );
    }
  };

  const updateIncident = async ({ incidentId, incident }: ExternalServiceParams) => {
    try {
      const res = await patch({
        axios: axiosInstance,
        url: `${incidentUrl}/${incidentId}`,
        logger,
        data: { ...(incident as Record<string, unknown>) },
        configurationUtilities,
      });
      checkInstance(res);
      return {
        title: res.data.result.number,
        id: res.data.result.sys_id,
        pushedDate: new Date(addTimeZoneToDate(res.data.result.sys_updated_on)).toISOString(),
        url: getIncidentViewURL(res.data.result.sys_id),
      };
    } catch (error) {
      throw new Error(
        getErrorMessage(
          i18n.NAME,
          `Unable to update incident with id ${incidentId}. Error: ${error.message}`
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
      throw new Error(getErrorMessage(i18n.NAME, `Unable to get fields. Error: ${error.message}`));
    }
  };

  return {
    createIncident,
    findIncidents,
    getFields,
    getIncident,
    updateIncident,
  };
};
