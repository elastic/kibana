/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import { CasesConnectorFeatureId } from '@kbn/actions-plugin/common';
import type { SnakeToCamelCase } from '../../../common/types';
import type {
  ConfigurationPatchRequest,
  ConfigurationRequest,
  CreateConfigureResponse,
  GetConfigureResponse,
  UpdateConfigureResponse,
} from '../../../common/types/api';
import type {
  ActionConnector,
  ActionTypeConnector,
  Configuration,
} from '../../../common/types/domain';
import { getAllConnectorTypesUrl } from '../../../common/utils/connectors_api';
import { getCaseConfigurationDetailsUrl } from '../../../common/api';
import { CASE_CONFIGURE_CONNECTORS_URL, CASE_CONFIGURE_URL } from '../../../common/constants';
import { KibanaServices } from '../../common/lib/kibana';
import { convertToCamelCase, convertArrayToCamelCase } from '../../api/utils';
import type { ApiProps, CasesConfigurationUI } from '../types';
import { decodeCaseConfigurationsResponse, decodeCaseConfigureResponse } from '../utils';

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
}: ApiProps): Promise<CasesConfigurationUI[] | null> => {
  const response = await KibanaServices.get().http.fetch<GetConfigureResponse>(CASE_CONFIGURE_URL, {
    method: 'GET',
    signal,
  });

  if (!isEmpty(response)) {
    const decodedConfigs = decodeCaseConfigurationsResponse(response);
    if (Array.isArray(decodedConfigs) && decodedConfigs.length > 0) {
      return decodedConfigs.map((decodedConfig) => {
        const configuration = convertToCamelCase<
          GetConfigureResponse[number],
          SnakeToCamelCase<GetConfigureResponse[number]>
        >(decodedConfig);

        return convertConfigureResponseToCasesConfigure(configuration);
      });
    }
  }

  return null;
};

export const postCaseConfigure = async (
  caseConfiguration: ConfigurationRequest
): Promise<CasesConfigurationUI> => {
  const response = await KibanaServices.get().http.fetch<CreateConfigureResponse>(
    CASE_CONFIGURE_URL,
    {
      method: 'POST',
      body: JSON.stringify(caseConfiguration),
    }
  );

  const configuration = convertToCamelCase<
    CreateConfigureResponse,
    SnakeToCamelCase<CreateConfigureResponse>
  >(decodeCaseConfigureResponse(response));

  return convertConfigureResponseToCasesConfigure(configuration);
};

export const patchCaseConfigure = async (
  id: string,
  caseConfiguration: ConfigurationPatchRequest
): Promise<CasesConfigurationUI> => {
  const response = await KibanaServices.get().http.fetch<UpdateConfigureResponse>(
    getCaseConfigurationDetailsUrl(id),
    {
      method: 'PATCH',
      body: JSON.stringify(caseConfiguration),
    }
  );

  const configuration = convertToCamelCase<
    UpdateConfigureResponse,
    SnakeToCamelCase<UpdateConfigureResponse>
  >(decodeCaseConfigureResponse(response));

  return convertConfigureResponseToCasesConfigure(configuration);
};

export const fetchActionTypes = async ({ signal }: ApiProps): Promise<ActionTypeConnector[]> => {
  const response = await KibanaServices.get().http.fetch<ActionTypeConnector[]>(
    getAllConnectorTypesUrl(),
    { method: 'GET', signal, query: { feature_id: CasesConnectorFeatureId } }
  );

  return convertArrayToCamelCase(response) as ActionTypeConnector[];
};

const convertConfigureResponseToCasesConfigure = (
  configuration: SnakeToCamelCase<Configuration>
): CasesConfigurationUI => {
  const { id, version, mappings, customFields, templates, closureType, connector, owner } =
    configuration;

  return { id, version, mappings, customFields, templates, closureType, connector, owner };
};
