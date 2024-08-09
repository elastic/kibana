/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

export interface SearchApplicationNameProps {
  searchApplicationName: string;
}

export type SearchApplicationNameValues = SearchApplicationNameProps;

export interface SearchApplicationNameActions {
  setSearchApplicationName: (name: string) => { name: string };
}

export const SearchApplicationNameLogic = kea<
  MakeLogicType<
    SearchApplicationNameValues,
    SearchApplicationNameActions,
    SearchApplicationNameProps
  >
>({
  actions: {
    setSearchApplicationName: (name) => ({ name }),
  },
  path: ['enterprise_search', 'search_applications', 'search_application_name'],
  reducers: ({ props }) => ({
    searchApplicationName: [
      // Short-circuiting this to empty string is necessary to enable testing logics relying on this
      props.searchApplicationName ?? '',
      {
        // @ts-expect-error upgrade typescript v5.1.6
        setSearchApplicationName: (_, { name }) => name,
      },
    ],
  }),
});
