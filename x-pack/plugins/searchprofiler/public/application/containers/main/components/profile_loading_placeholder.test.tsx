/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TestUtils } from 'src/plugins/es_ui_shared/public';
import { ProfileLoadingPlaceholder } from '.';

const { registerTestBed } = TestUtils;

describe('Profile Loading Placeholder', () => {
  it('renders', async () => {
    const init = registerTestBed(ProfileLoadingPlaceholder);
    await init();
  });
});
