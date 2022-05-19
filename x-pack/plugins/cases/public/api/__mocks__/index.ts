/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CasesFindRequest, CasesMetricsRequest } from '../../../common/api';
import { HTTPService } from '..';
import { casesMetrics, casesStatus } from '../../containers/mock';
import { CasesMetrics, CasesStatus } from '../../containers/types';

export const getCasesStatus = async ({
  http,
  signal,
  query,
}: HTTPService & { query: CasesFindRequest }): Promise<CasesStatus> => Promise.resolve(casesStatus);

export const getCasesMetrics = async ({
  http,
  signal,
  query,
}: HTTPService & { query: CasesMetricsRequest }): Promise<CasesMetrics> =>
  Promise.resolve(casesMetrics);
