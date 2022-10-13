/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CasesConfigurePatch,
  CasesConfigureRequest,
  ActionConnector,
  ActionTypeConnector,
} from '../../../../common/api';

import { ApiProps } from '../../types';
import { CaseConfigure } from '../types';
import { caseConfigurationCamelCaseResponseMock } from '../mock';
import { actionTypesMock, connectorsMock } from '../../../common/mock/connectors';

export const fetchConnectors = async ({ signal }: ApiProps): Promise<ActionConnector[]> =>
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

export const fetchActionTypes = async ({ signal }: ApiProps): Promise<ActionTypeConnector[]> =>
  Promise.resolve(actionTypesMock);
