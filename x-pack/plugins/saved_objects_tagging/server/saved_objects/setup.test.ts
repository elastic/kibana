/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from 'src/core/server/mocks';

import { setupSavedObjects } from './setup';
import { tagType } from './tag';

describe('setupSavedObjects', () => {
  it('registers the Tag object type', () => {
    const { savedObjects } = coreMock.createSetup();
    setupSavedObjects({ savedObjects });
    expect(savedObjects.registerType).toHaveBeenCalledTimes(1);
    expect(savedObjects.registerType).toHaveBeenCalledWith(tagType);
  });

  it('registers the Tagging saved objects client wrapper', () => {
    const { savedObjects } = coreMock.createSetup();
    setupSavedObjects({ savedObjects });
    expect(savedObjects.addClientWrapper).toHaveBeenCalledTimes(1);
    expect(savedObjects.addClientWrapper).toHaveBeenCalledWith(
      expect.any(Number),
      'savedObjectsTagging',
      expect.any(Function)
    );
  });
});
