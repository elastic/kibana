/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IEsSearchResponse, IEsSearchRequest } from 'src/plugins/data/public';
import { FactoryQueryTypes } from '../..';
import { EVENT_ENRICHMENT_INDICATOR_FIELD_MAP } from '../../../cti/constants';
import { Inspect, TimerangeInput } from '../../common';
import { RequestBasicOptions } from '..';

export enum CtiQueries {
  eventEnrichment = 'eventEnrichment',
  threatIntelSource = 'threatIntelSource',
}

export interface CtiEventEnrichmentRequestOptions extends RequestBasicOptions {
  eventFields: Record<string, unknown>;
}

export type CtiEnrichment = Record<string, unknown[]>;
export type EventFields = Record<string, unknown>;

export interface CtiEnrichmentIdentifiers {
  id: string | undefined;
  field: string | undefined;
  value: string | undefined;
  type: string | undefined;
  provider: string | undefined;
}

export interface CtiEventEnrichmentStrategyResponse extends IEsSearchResponse {
  enrichments: CtiEnrichment[];
  inspect: Inspect;
  totalCount: number;
}

export type EventField = keyof typeof EVENT_ENRICHMENT_INDICATOR_FIELD_MAP;
export const validEventFields = Object.keys(EVENT_ENRICHMENT_INDICATOR_FIELD_MAP) as EventField[];

export const isValidEventField = (field: string): field is EventField =>
  validEventFields.includes(field as EventField);

export interface CtiThreatIntelSourceRequestOptions extends IEsSearchRequest {
  defaultIndex: string[];
  factoryQueryType?: FactoryQueryTypes;
  hostName?: string;
  timerange?: TimerangeInput;
}
export type CtiThreatIntelSourceStrategyResponse = IEsSearchResponse;
