/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { IEsSearchResponse, IEsSearchRequest } from 'src/plugins/data/public';
import { FactoryQueryTypes } from '../..';
import { EVENT_ENRICHMENT_INDICATOR_FIELD_MAP } from '../../../cti/constants';
import { Inspect, Maybe, TimerangeInput } from '../../common';
import { RequestBasicOptions } from '..';

export enum CtiQueries {
  eventEnrichment = 'eventEnrichment',
  dataSource = 'dataSource',
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
  feedName: string | undefined;
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

export interface CtiDataSourceRequestOptions extends IEsSearchRequest {
  defaultIndex: string[];
  factoryQueryType?: FactoryQueryTypes;
  timerange?: TimerangeInput;
}

export interface BucketItem {
  key: string;
  doc_count: number;
}
export interface Bucket {
  buckets: Array<BucketItem & { bucket?: Bucket[] }>;
}

export type DatasetBucket = {
  name?: Bucket;
  dashboard?: Bucket;
} & BucketItem;

export interface CtiDataSourceStrategyResponse extends Omit<IEsSearchResponse, 'rawResponse'> {
  inspect?: Maybe<Inspect>;
  rawResponse: {
    aggregations?: Record<string, estypes.AggregationsAggregate> & {
      dataset?: {
        buckets: DatasetBucket[];
      };
    };
  };
}
