/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

interface HeaderActionsLogicValues {
  isSearchEnginesPopoverOpen: boolean;
}

interface HeaderActionsLogicActions {
  toggleSearchEnginesPopover: void;
}

export const HeaderActionsLogic = kea<
  MakeLogicType<HeaderActionsLogicValues, HeaderActionsLogicActions>
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
