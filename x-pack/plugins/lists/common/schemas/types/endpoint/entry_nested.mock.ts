/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FIELD, NESTED } from '../../../constants.mock';

import { EndpointEntryNested } from './entry_nested';
import { getEndpointEntryMatchMock } from './entry_match.mock';
import { getEndpointEntryMatchAnyMock } from './entry_match_any.mock';

export const getEndpointEntryNestedMock = (): EndpointEntryNested => ({
  entries: [getEndpointEntryMatchMock(), getEndpointEntryMatchAnyMock()],
  field: FIELD,
  type: NESTED,
});
