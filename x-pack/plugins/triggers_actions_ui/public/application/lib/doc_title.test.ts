/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { getCurrentDocTitle } from './doc_title';

describe('getCurrentDocTitle', () => {
  test('if change calls return the proper doc title ', async () => {
    expect(getCurrentDocTitle('home') === 'Alerts and Actions').toBeTruthy();
    expect(getCurrentDocTitle('connectors') === 'Connectors').toBeTruthy();
    expect(getCurrentDocTitle('alerts') === 'Alerts').toBeTruthy();
  });
});
