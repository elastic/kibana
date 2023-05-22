/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAddToExistingCaseLensAction } from './add_to_existing_case';



describe('createAddToExistingCaseLensAction', () => {
  const action = createAddToExistingCaseLensAction({
    core,
    plugins,
    storage,
    history,
    caseContextProps,
  });
  test('it should return display name', () => {});
});
