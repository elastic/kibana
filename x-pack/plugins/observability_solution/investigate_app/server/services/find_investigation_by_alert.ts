/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FindInvestigationsByAlertParams,
  FindInvestigationsByAlertResponse,
  findInvestigationsByAlertResponseSchema,
} from '../../common/schema/find_by_alert';
import { InvestigationRepository } from './investigation_repository';

export async function findInvestigationsByAlert(
  params: FindInvestigationsByAlertParams,
  repository: InvestigationRepository
): Promise<FindInvestigationsByAlertResponse> {
  const investigations = await repository.findByAlertId(params.alertId);

  return findInvestigationsByAlertResponseSchema.encode(investigations);
}
