/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IEsSearchResponse } from 'src/plugins/data/public';
import { Inspect } from '../../common';
import { RequestBasicOptions } from '..';

export enum CtiQueries {
  eventEnrichment = 'eventEnrichment',
}

export interface CtiEventEnrichmentRequestOptions extends RequestBasicOptions {
  eventFields: Record<string, unknown>;
}

export type CtiEnrichment = Record<string, unknown[]>;

export interface CtiEventEnrichmentStrategyResponse extends IEsSearchResponse {
  enrichments: CtiEnrichment[];
  inspect?: Inspect;
  totalCount: number;
}
