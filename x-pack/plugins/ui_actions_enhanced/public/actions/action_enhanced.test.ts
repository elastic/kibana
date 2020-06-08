/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionEnhancedDefinition } from './action_enhanced';
import { ActionEnhancedInternal } from './action_enhanced_internal';
import { licenseMock } from '../../../licensing/common/licensing.mock';

describe('ActionEnhanced', () => {
  const def: ActionEnhancedDefinition = {
    id: 'test',
    async execute() {},
  };

  describe('License checks inside isCompatible', () => {
    test('no license requirements', async () => {
      const action = new ActionEnhancedInternal(def, () => licenseMock.createLicense());
      expect(await action.isCompatible({})).toBe(true);
    });

    test('not enough license level', async () => {
      const action = new ActionEnhancedInternal({ ...def, minimalLicense: 'gold' }, () =>
        licenseMock.createLicense()
      );
      expect(await action.isCompatible({})).toBe(false);
    });

    test('enough license level', async () => {
      const action = new ActionEnhancedInternal({ ...def, minimalLicense: 'gold' }, () =>
        licenseMock.createLicense({ license: { type: 'gold' } })
      );
      expect(await action.isCompatible({})).toBe(true);
    });
  });
});
