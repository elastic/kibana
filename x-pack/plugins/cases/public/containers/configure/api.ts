/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import { CasesConnectorFeatureId } from '@kbn/actions-plugin/common';
import { getAllConnectorTypesUrl } from '../../../common/utils/connectors_api';
import type {
  ActionConnector,
  ActionTypeConnector,
  ConfigurationPatchRequest,
  ConfigurationRequest,
  Configuration,
  Configurations,
} from '../../../common/api';
import { getCaseConfigurationDetailsUrl } from '../../../common/api';
import { CASE_CONFIGURE_CONNECTORS_URL, CASE_CONFIGURE_URL } from '../../../common/constants';
import { KibanaServices } from '../../common/lib/kibana';
import { convertToCamelCase, convertArrayToCamelCase } from '../../api/utils';
import type { ApiProps } from '../types';
import { decodeCaseConfigurationsResponse, decodeCaseConfigureResponse } from '../utils';
import type { CaseConfigure } from './types';

export const getSupportedActionConnectors = async ({
  signal,
}: ApiProps): Promise<ActionConnector[]> => {
  const response = await KibanaServices.get().http.fetch<ActionConnector[]>(
    `${CASE_CONFIGURE_CONNECTORS_URL}/_find`,
    { method: 'GET', signal }
  );

  return response;
};

export const getCaseConfigure = async ({
  signal,
  owner,
}: ApiProps & { owner: string[] }): Promise<CaseConfigure | null> => {
  const response = await KibanaServices.get().http.fetch<Configurations>(CASE_CONFIGURE_URL, {
    method: 'GET',
    signal,
    query: { ...(owner.length > 0 ? { owner } : {}) },
  });

  if (!isEmpty(response)) {
    const decodedConfigs = decodeCaseConfigurationsResponse(response);
    if (Array.isArray(decodedConfigs) && decodedConfigs.length > 0) {
      return convertToCamelCase<Configuration, CaseConfigure>(decodedConfigs[0]);
    }
  }

  return null;
};

export const postCaseConfigure = async (
  caseConfiguration: ConfigurationRequest,
  signal: AbortSignal
): Promise<CaseConfigure> => {
  const response = await KibanaServices.get().http.fetch<Configuration>(CASE_CONFIGURE_URL, {
    method: 'POST',
    body: JSON.stringify(caseConfiguration),
    signal,
  });
  return convertToCamelCase<Configuration, CaseConfigure>(decodeCaseConfigureResponse(response));
};

export const patchCaseConfigure = async (
  id: string,
  caseConfiguration: ConfigurationPatchRequest,
  signal: AbortSignal
): Promise<CaseConfigure> => {
  const response = await KibanaServices.get().http.fetch<Configuration>(
    getCaseConfigurationDetailsUrl(id),
    {
      method: 'PATCH',
      body: JSON.stringify(caseConfiguration),
      signal,
    }
  );
  return convertToCamelCase<Configuration, CaseConfigure>(decodeCaseConfigureResponse(response));
};

export const fetchActionTypes = async ({ signal }: ApiProps): Promise<ActionTypeConnector[]> => {
  const response = await KibanaServices.get().http.fetch<ActionTypeConnector[]>(
    getAllConnectorTypesUrl(),
    { method: 'GET', signal, query: { feature_id: CasesConnectorFeatureId } }
  );

  return convertArrayToCamelCase(response) as ActionTypeConnector[];
};
