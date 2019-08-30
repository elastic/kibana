/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ILicense } from './types';
import { Plugin } from './plugin';
import { setup } from './__fixtures__/setup';

describe('licensing feature', () => {
  let plugin: Plugin;
  let license: ILicense;

  afterEach(async () => {
    await plugin.stop();
  });

  test('isAvailable', async () => {
    ({ plugin, license } = await setup());

    const security = license.getFeature('security');

    expect(security!.isAvailable).toBe(true);
  });

  test('isEnabled', async () => {
    ({ plugin, license } = await setup());

    const security = license.getFeature('security');

    expect(security!.isEnabled).toBe(true);
  });

  test('name', async () => {
    ({ plugin, license } = await setup());

    const security = license.getFeature('security');

    expect(security!.name).toBe('security');
  });
});
