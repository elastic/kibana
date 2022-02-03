/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ValidFeatureId } from '@kbn/rule-data-utils';
import { IEsSearchRequest, IEsSearchResponse } from 'src/plugins/data/common';
import { ParsedTechnicalFields } from '../';

export type RuleRegistrySearchRequest = IEsSearchRequest & {
  featureIds: ValidFeatureId[];
  query?: string;
};
export type RuleRegistrySearchResponse = IEsSearchResponse<ParsedTechnicalFields>;
