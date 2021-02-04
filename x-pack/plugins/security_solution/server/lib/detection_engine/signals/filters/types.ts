/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'src/core/server';

import { ListClient } from '../../../../../../lists/server';
import { BuildRuleMessage } from '../rule_messages';
import { ExceptionListItemSchema, Type } from '../../../../../../lists/common/schemas';
import { SearchResponse } from '../../../types';

export interface FilterEventsAgainstListOptions<T> {
  listClient: ListClient;
  exceptionsList: ExceptionListItemSchema[];
  logger: Logger;
  eventSearchResult: SearchResponse<T>;
  buildRuleMessage: BuildRuleMessage;
}

export interface CreateSetToFilterAgainstOptions<T> {
  events: SearchResponse<T>['hits']['hits'];
  field: string;
  listId: string;
  listType: Type;
  listClient: ListClient;
  logger: Logger;
  buildRuleMessage: BuildRuleMessage;
}

export interface FilterEventsOptions<T> {
  events: SearchResponse<T>['hits']['hits'];
  fieldAndSetTuples: FieldSet[];
}

export interface CreateFieldAndSetTuplesOptions<T> {
  events: SearchResponse<T>['hits']['hits'];
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
