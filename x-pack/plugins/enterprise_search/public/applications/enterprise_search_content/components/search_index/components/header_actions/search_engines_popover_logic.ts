/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

interface SearchEnginesPopoverLogicValues {
  isSearchEnginesPopoverOpen: boolean;
}

interface SearchEnginesPopoverLogicActions {
  toggleSearchEnginesPopover: void;
}

export const SearchEnginesPopoverLogic = kea<
  MakeLogicType<SearchEnginesPopoverLogicValues, SearchEnginesPopoverLogicActions>
>({
  actions: {
    toggleSearchEnginesPopover: true,
  },
  path: ['enterprise_search', 'search_index', 'header'],
  reducers: () => ({
    isSearchEnginesPopoverOpen: [
      false,
      {
        toggleSearchEnginesPopover: (state) => !state,
      },
    ],
  }),
});
