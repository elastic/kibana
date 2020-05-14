/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CasesConfigurePatch,
  CasesConfigureRequest,
  Connector,
} from '../../../../../../case/common/api';

import { ApiProps } from '../../types';
import { CaseConfigure } from '../types';
import { connectorsMock, caseConfigurationCamelCaseResponseMock } from '../mock';

export const fetchConnectors = async ({ signal }: ApiProps): Promise<Connector[]> =>
  Promise.resolve(connectorsMock);

export const getCaseConfigure = async ({ signal }: ApiProps): Promise<CaseConfigure> =>
  Promise.resolve(caseConfigurationCamelCaseResponseMock);

export const postCaseConfigure = async (
  caseConfiguration: CasesConfigureRequest,
  signal: AbortSignal
): Promise<CaseConfigure> => Promise.resolve(caseConfigurationCamelCaseResponseMock);

export const patchCaseConfigure = async (
  caseConfiguration: CasesConfigurePatch,
  signal: AbortSignal
): Promise<CaseConfigure> => Promise.resolve(caseConfigurationCamelCaseResponseMock);
