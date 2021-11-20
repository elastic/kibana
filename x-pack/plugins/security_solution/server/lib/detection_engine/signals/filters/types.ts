/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Logger } from 'src/core/server';

import type { Type, ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { ListClient } from '../../../../../../lists/server';
import { BuildRuleMessage } from '../rule_messages';

export interface FilterEventsAgainstListOptions<T> {
  listClient: ListClient;
  exceptionsList: ExceptionListItemSchema[];
  logger: Logger;
  eventSearchResult: estypes.SearchResponse<T>;
  buildRuleMessage: BuildRuleMessage;
}

export interface CreateSetToFilterAgainstOptions<T> {
  events: Array<estypes.SearchHit<T>>;
  field: string;
  listId: string;
  listType: Type;
  listClient: ListClient;
  logger: Logger;
  buildRuleMessage: BuildRuleMessage;
}

export interface FilterEventsOptions<T> {
  events: Array<estypes.SearchHit<T>>;
  fieldAndSetTuples: FieldSet[];
}

export interface CreateFieldAndSetTuplesOptions<T> {
  events: Array<estypes.SearchHit<T>>;
  exceptionItem: ExceptionListItemSchema;
  listClient: ListClient;
  logger: Logger;
  buildRuleMessage: BuildRuleMessage;
}

export interface FieldSet {
  field: string;
  operator: 'excluded' | 'included';
  matchedSet: Set<unknown>;
}
