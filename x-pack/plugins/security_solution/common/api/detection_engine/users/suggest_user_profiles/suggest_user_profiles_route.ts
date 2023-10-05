/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { user_search_term } from '../../model';

export const suggestUserProfilesRequestQuery = t.exact(
  t.partial({
    searchTerm: user_search_term,
  })
);

export type SuggestUserProfilesRequestQuery = t.TypeOf<typeof suggestUserProfilesRequestQuery>;
export type SuggestUserProfilesRequestQueryDecoded = SuggestUserProfilesRequestQuery;
