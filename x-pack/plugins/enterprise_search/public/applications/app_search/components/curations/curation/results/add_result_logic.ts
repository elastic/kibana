/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

interface AddResultValues {
  isFlyoutOpen: boolean;
}

interface AddResultActions {
  openFlyout(): void;
  closeFlyout(): void;
}

export const AddResultLogic = kea<MakeLogicType<AddResultValues, AddResultActions>>({
  path: ['enterprise_search', 'app_search', 'curation_add_result_logic'],
  actions: () => ({
    openFlyout: true,
    closeFlyout: true,
  }),
  reducers: () => ({
    isFlyoutOpen: [
      false,
      {
        openFlyout: () => true,
        closeFlyout: () => false,
      },
    ],
  }),
});
