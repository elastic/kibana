/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';

import { ExternalServiceCredentials, ExternalService, ExternalServiceParams } from '../case/types';
import { addTimeZoneToDate, patch, request, getErrorMessage } from '../case/utils';

import * as i18n from './translations';
import {
  ServiceNowPublicConfigurationType,
  ServiceNowSecretConfigurationType,
  CreateIncidentRequest,
  UpdateIncidentRequest,
  CreateCommentRequest,
} from './types';

const API_VERSION = 'v2';
const INCIDENT_URL = `api/now/${API_VERSION}/table/incident`;
const COMMENT_URL = `api/now/${API_VERSION}/table/incident`;

// Based on: https://docs.servicenow.com/bundle/orlando-platform-user-interface/page/use/navigation/reference/r_NavigatingByURLExamples.html
const VIEW_INCIDENT_URL = `nav_to.do?uri=incident.do?sys_id=`;

export const createExternalService = ({
  config,
  secrets,
}: ExternalServiceCredentials): ExternalService => {
  const { apiUrl: url } = config as ServiceNowPublicConfigurationType;
  const { username, password } = secrets as ServiceNowSecretConfigurationType;

  if (!url || !username || !password) {
    throw Error(`[Action]${i18n.NAME}: Wrong configuration.`);
  }

  const incidentUrl = `${url}/${INCIDENT_URL}`;
  const commentUrl = `${url}/${COMMENT_URL}`;
  const axiosInstance = axios.create({
    auth: { username, password },
  });

  const getIncidentViewURL = (id: string) => {
    return `${url}/${VIEW_INCIDENT_URL}${id}`;
  };

  const getIncident = async (id: string) => {
    try {
      const res = await request({
        axios: axiosInstance,
        url: `${incidentUrl}/${id}`,
      });

      return { ...res.data.result };
    } catch (error) {
      throw new Error(
        getErrorMessage(i18n.NAME, `Unable to get incident with id ${id}. Error: ${error.message}`)
      );
    }
  };

  const createIncident = async ({ incident }: ExternalServiceParams) => {
    try {
      const res = await request<CreateIncidentRequest>({
        axios: axiosInstance,
        url: `${incidentUrl}`,
        method: 'post',
        data: { ...incident },
      });

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
      const res = await patch<UpdateIncidentRequest>({
        axios: axiosInstance,
        url: `${incidentUrl}/${incidentId}`,
        data: { ...incident },
      });

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

  const createComment = async ({ incidentId, comment, field }: ExternalServiceParams) => {
    try {
      const res = await patch<CreateCommentRequest>({
        axios: axiosInstance,
        url: `${commentUrl}/${incidentId}`,
        data: { [field]: comment.comment },
      });

      return {
        commentId: comment.commentId,
        pushedDate: new Date(addTimeZoneToDate(res.data.result.sys_updated_on)).toISOString(),
      };
    } catch (error) {
      throw new Error(
        getErrorMessage(
          i18n.NAME,
          `Unable to create comment at incident with id ${incidentId}. Error: ${error.message}`
        )
      );
    }
  };

  return {
    getIncident,
    createIncident,
    updateIncident,
    createComment,
  };
};
