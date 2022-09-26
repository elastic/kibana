/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

interface IndexCreatedCalloutLogicValues {
  isCalloutVisible: boolean;
}

interface IndexCreatedCalloutLogicActions {
  dismissIndexCreatedCallout: void;
  showIndexCreatedCallout: void;
}

export const IndexCreatedCalloutLogic = kea<
  MakeLogicType<IndexCreatedCalloutLogicValues, IndexCreatedCalloutLogicActions>
>({
  actions: {
    dismissIndexCreatedCallout: true,
    showIndexCreatedCallout: true,
  },
  path: ['enterprise_search', 'search_index', 'index_created_callout'],
  reducers: () => ({
    isCalloutVisible: [
      false,
      {
        dismissIndexCreatedCallout: () => false,
        showIndexCreatedCallout: () => true,
      },
    ],
  }),
});
