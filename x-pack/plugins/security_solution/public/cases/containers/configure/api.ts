/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash/fp';
import {
  Connector,
  CasesConfigurePatch,
  CasesConfigureResponse,
  CasesConfigureRequest,
} from '../../../../../case/common/api';
import { KibanaServices } from '../../../common/lib/kibana';

import {
  CASE_CONFIGURE_CONNECTORS_URL,
  CASE_CONFIGURE_URL,
} from '../../../../../case/common/constants';

import { ApiProps } from '../types';
import { convertToCamelCase, decodeCaseConfigureResponse } from '../utils';
import { CaseConfigure } from './types';

export const fetchConnectors = async ({ signal }: ApiProps): Promise<Connector[]> => {
  const response = await KibanaServices.get().http.fetch(`${CASE_CONFIGURE_CONNECTORS_URL}/_find`, {
    method: 'GET',
    signal,
  });

  return response;
};

export const getCaseConfigure = async ({ signal }: ApiProps): Promise<CaseConfigure | null> => {
  const response = await KibanaServices.get().http.fetch<CasesConfigureResponse>(
    CASE_CONFIGURE_URL,
    {
      method: 'GET',
      signal,
    }
  );

  return !isEmpty(response)
    ? convertToCamelCase<CasesConfigureResponse, CaseConfigure>(
        decodeCaseConfigureResponse(response)
      )
    : null;
};

export const postCaseConfigure = async (
  caseConfiguration: CasesConfigureRequest,
  signal: AbortSignal
): Promise<CaseConfigure> => {
  const response = await KibanaServices.get().http.fetch<CasesConfigureResponse>(
    CASE_CONFIGURE_URL,
    {
      method: 'POST',
      body: JSON.stringify(caseConfiguration),
      signal,
    }
  );
  return convertToCamelCase<CasesConfigureResponse, CaseConfigure>(
    decodeCaseConfigureResponse(response)
  );
};

export const patchCaseConfigure = async (
  caseConfiguration: CasesConfigurePatch,
  signal: AbortSignal
): Promise<CaseConfigure> => {
  const response = await KibanaServices.get().http.fetch<CasesConfigureResponse>(
    CASE_CONFIGURE_URL,
    {
      method: 'PATCH',
      body: JSON.stringify(caseConfiguration),
      signal,
    }
  );
  return convertToCamelCase<CasesConfigureResponse, CaseConfigure>(
    decodeCaseConfigureResponse(response)
  );
};
