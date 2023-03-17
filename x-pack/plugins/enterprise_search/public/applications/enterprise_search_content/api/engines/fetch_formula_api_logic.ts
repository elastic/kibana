/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormulaPublicApi, LensPublicStart } from '@kbn/lens-plugin/public';

import { createApiLogic } from '../../../shared/api_logic/create_api_logic';

export interface FetchFormulaPublicApiParams {
  lens: LensPublicStart;
}
export type FetchFormulaPublicApiResponse = FormulaPublicApi | null;

export const fetchFormulaPublicApiLogic = async ({
  lens,
}: FetchFormulaPublicApiParams): Promise<FetchFormulaPublicApiResponse> => {
  const { formula } = (await lens?.stateHelperApi()) ?? null;
  return formula;
};
export const FetchFormulaPublicApiLogic = createApiLogic(
  ['fetch_formula_api_logic'],
  fetchFormulaPublicApiLogic
);
