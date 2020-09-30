/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EndpointEntriesArray } from './entries';
import { getEndpointEntryMatchMock } from './entry_match.mock';
import { getEndpointEntryMatchAnyMock } from './entry_match_any.mock';
import { getEndpointEntryNestedMock } from './entry_nested.mock';

export const getEndpointEntriesArrayMock = (): EndpointEntriesArray => [
  getEndpointEntryMatchMock(),
  getEndpointEntryMatchAnyMock(),
  getEndpointEntryNestedMock(),
];
