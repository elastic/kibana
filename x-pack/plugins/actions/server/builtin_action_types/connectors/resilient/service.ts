/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';

import { ExternalServiceCredential, ExternalService, ExternalServiceParams } from '../types';
import { addTimeZoneToDate, patch, request, getErrorMessage } from '../utils';
import { ResilientPublicConfigurationType, ResilientSecretConfigurationType } from './types';

import * as i18n from './translations';

const BASE_URL = 'rest/orgs/';
const INCIDENT_URL = `incidents`;
const COMMENT_URL = `tasks`;

const VIEW_INCIDENT_URL = `#incidents`;

export const createExternalService = ({
  config,
  secrets,
}: ExternalServiceCredential): ExternalService => {
  const { apiUrl: url, orgId } = config as ResilientPublicConfigurationType;
  const { apiKey, apiSecret } = secrets as ResilientSecretConfigurationType;
  let apiKeyHandle;

  if (!url || !apiKey || !apiSecret) {
    throw Error(`[Action]${i18n.NAME}: Wrong configuration.`);
  }

  const incidentUrl = `${url}/${BASE_URL}/${orgId}/${INCIDENT_URL}`;
  const commentUrl = `${url}/${BASE_URL}/${orgId}/${COMMENT_URL}`;
  const sessionUrl = `${url}/rest/session`;
  const axiosInstance = axios.create({
    auth: { username: apiKey, password: apiSecret },
  });

  const getIncidentViewURL = (id: string) => {
    return `${url}/${VIEW_INCIDENT_URL}/${id}`;
  };

  const getApiKeyHandle = async (): Promise<string> => {
    try {
      const res = await request({
        axios: axiosInstance,
        url: sessionUrl,
      });

      return res.data.api_key_handle;
    } catch (error) {
      throw new Error(getErrorMessage(i18n.NAME, `Unable to authenticate user`));
    }
  };
  const getIncident = async (id: string) => {};

  const createIncident = async ({ incident }: ExternalServiceParams) => {};

  const updateIncident = async ({ incidentId, incident }: ExternalServiceParams) => {};

  const createComment = async ({ incidentId, comment, field }: ExternalServiceParams) => {};

  return {
    getIncident,
    createIncident,
    updateIncident,
    createComment,
  };
};
