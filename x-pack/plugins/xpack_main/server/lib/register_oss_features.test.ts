/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FeatureRegistry } from './feature_registry';
import { registerOssFeatures } from './register_oss_features';

describe('registerOssFeatures', () => {
  it('allows features to be registered', () => {
    const registry = new FeatureRegistry();
    const savedObjectTypes = ['foo', 'bar'];
    registerOssFeatures(feature => registry.register(feature), savedObjectTypes);

    const features = registry.getAll();
    expect(features.map(f => f.id)).toMatchInlineSnapshot(`
Array [
  "discover",
  "visualize",
  "dashboard",
  "dev_tools",
  "advancedSettings",
  "indexPatterns",
  "savedObjectsManagement",
  "timelion",
]
`);
  });
});
