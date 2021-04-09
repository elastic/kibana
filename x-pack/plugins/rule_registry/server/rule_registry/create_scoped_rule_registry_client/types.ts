/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESSearchRequest, ESSearchResponse } from 'typings/elasticsearch';
import { DefaultFieldMap } from '../defaults/field_map';
import { PatternsUnionOf, PickWithPatterns } from '../field_map/pick_with_patterns';
import { OutputOfFieldMap } from '../field_map/runtime_type_from_fieldmap';

export type PrepopulatedRuleEventFields =
  | 'rule.uuid'
  | 'rule.id'
  | 'rule.name'
  | 'rule.type'
  | 'rule.category'
  | 'producer';

type FieldsOf<TFieldMap extends DefaultFieldMap> =
  | Array<{ field: PatternsUnionOf<TFieldMap> } | PatternsUnionOf<TFieldMap>>
  | PatternsUnionOf<TFieldMap>;

type Fields<TPattern extends string> = Array<{ field: TPattern } | TPattern> | TPattern;

type FieldsESSearchRequest<TFieldMap extends DefaultFieldMap> = ESSearchRequest & {
  body?: { fields: FieldsOf<TFieldMap> };
};

export type EventsOf<
  TFieldsESSearchRequest extends ESSearchRequest,
  TFieldMap extends DefaultFieldMap
> = TFieldsESSearchRequest extends { body: { fields: infer TFields } }
  ? TFields extends Fields<infer TPattern>
    ? Array<OutputOfFieldMap<PickWithPatterns<TFieldMap, TPattern[]>>>
    : never
  : never;

export interface ScopedRuleRegistryClient<TFieldMap extends DefaultFieldMap> {
  search<TSearchRequest extends FieldsESSearchRequest<TFieldMap>>(
    request: TSearchRequest
  ): Promise<{
    body: ESSearchResponse<unknown, TSearchRequest>;
    events: EventsOf<TSearchRequest, TFieldMap>;
  }>;
  index(doc: Omit<OutputOfFieldMap<TFieldMap>, PrepopulatedRuleEventFields>): void;
  bulkIndex(
    doc: Array<Omit<OutputOfFieldMap<TFieldMap>, PrepopulatedRuleEventFields>>
  ): Promise<void>;
}
