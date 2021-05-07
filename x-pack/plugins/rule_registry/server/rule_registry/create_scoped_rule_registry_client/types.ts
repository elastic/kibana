/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldDescriptor } from 'src/plugins/data/server';
import { ESSearchRequest, ESSearchResponse } from 'typings/elasticsearch';
import {
  PatternsUnionOf,
  PickWithPatterns,
  OutputOfFieldMap,
  BaseRuleFieldMap,
} from '../../../common';

export type PrepopulatedRuleEventFields = keyof Pick<
  BaseRuleFieldMap,
  'rule.uuid' | 'rule.id' | 'rule.name' | 'rule.category' | 'kibana.rac.producer'
>;

type FieldsOf<TFieldMap extends BaseRuleFieldMap> =
  | Array<{ field: PatternsUnionOf<TFieldMap> } | PatternsUnionOf<TFieldMap>>
  | PatternsUnionOf<TFieldMap>;

type Fields<TPattern extends string> = Array<{ field: TPattern } | TPattern> | TPattern;

type FieldsESSearchRequest<TFieldMap extends BaseRuleFieldMap> = ESSearchRequest & {
  body?: { fields: FieldsOf<TFieldMap> };
};

export type EventsOf<
  TFieldsESSearchRequest extends ESSearchRequest,
  TFieldMap extends BaseRuleFieldMap
> = TFieldsESSearchRequest extends { body: { fields: infer TFields } }
  ? TFields extends Fields<infer TPattern>
    ? Array<OutputOfFieldMap<PickWithPatterns<TFieldMap, TPattern[]>>>
    : never
  : never;

export interface ScopedRuleRegistryClient<TFieldMap extends BaseRuleFieldMap> {
  search<TSearchRequest extends FieldsESSearchRequest<TFieldMap>>(
    request: TSearchRequest
  ): Promise<{
    body: ESSearchResponse<unknown, TSearchRequest>;
    events: EventsOf<TSearchRequest, TFieldMap>;
  }>;
  getDynamicIndexPattern(): Promise<{
    title: string;
    timeFieldName: string;
    fields: FieldDescriptor[];
  }>;
  index(doc: Omit<OutputOfFieldMap<TFieldMap>, PrepopulatedRuleEventFields>): void;
  bulkIndex(
    doc: Array<Omit<OutputOfFieldMap<TFieldMap>, PrepopulatedRuleEventFields>>
  ): Promise<void>;
}
