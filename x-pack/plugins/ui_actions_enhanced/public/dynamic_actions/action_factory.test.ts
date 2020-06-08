/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionFactory } from './action_factory';
import { ActionFactoryDefinition } from './action_factory_definition';
import { licenseMock } from '../../../licensing/common/licensing.mock';

const def: ActionFactoryDefinition = {
  id: 'ACTION_FACTORY_1',
  CollectConfig: {} as any,
  createConfig: () => ({}),
  isConfigValid: (() => true) as any,
  create: ({ name }) => ({
    id: '',
    execute: async () => {},
    getDisplayName: () => name,
  }),
};

describe('License & ActionFactory', () => {
  test('no license requirements', async () => {
    const factory = new ActionFactory(def, () => licenseMock.createLicense());
    expect(await factory.isCompatible({})).toBe(true);
    expect(factory.isCompatibleLicence()).toBe(true);
  });

  test('not enough license level', async () => {
    const factory = new ActionFactory({ ...def, minimalLicense: 'gold' }, () =>
      licenseMock.createLicense()
    );
    expect(await factory.isCompatible({})).toBe(true);
    expect(factory.isCompatibleLicence()).toBe(false);
  });

  test('enough license level', async () => {
    const factory = new ActionFactory({ ...def, minimalLicense: 'gold' }, () =>
      licenseMock.createLicense({ license: { type: 'gold' } })
    );
    expect(await factory.isCompatible({})).toBe(true);
    expect(factory.isCompatibleLicence()).toBe(true);
  });
});
