/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from 'src/core/server';

import { ListClient } from '../../../../../../lists/server';
import { SignalSearchResponse } from '../types';
import { BuildRuleMessage } from '../rule_messages';
import { ExceptionListItemSchema, Type } from '../../../../../../lists/common/schemas';

export interface FilterEventsAgainstList {
  listClient: ListClient;
  exceptionsList: ExceptionListItemSchema[];
  logger: Logger;
  eventSearchResult: SignalSearchResponse;
  buildRuleMessage: BuildRuleMessage;
}

export interface CreateSetToFilterAgainst {
  events: SignalSearchResponse['hits']['hits'];
  field: string;
  listId: string;
  listType: Type;
  listClient: ListClient;
  logger: Logger;
}
