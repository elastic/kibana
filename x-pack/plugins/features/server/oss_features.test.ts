/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { buildOSSFeatures } from './oss_features';
import { featurePrivilegeIterator } from '../../security/server/authorization';
import { Feature } from '.';

describe('buildOSSFeatures', () => {
  it('returns features including timelion', () => {
    expect(
      buildOSSFeatures({ savedObjectTypes: ['foo', 'bar'], includeTimelion: true }).map((f) => f.id)
    ).toMatchInlineSnapshot(`
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

  it('returns features excluding timelion', () => {
    expect(
      buildOSSFeatures({ savedObjectTypes: ['foo', 'bar'], includeTimelion: false }).map(
        (f) => f.id
      )
    ).toMatchInlineSnapshot(`
Array [
  "discover",
  "visualize",
  "dashboard",
  "dev_tools",
  "advancedSettings",
  "indexPatterns",
  "savedObjectsManagement",
]
`);
  });

  const features = buildOSSFeatures({ savedObjectTypes: ['foo', 'bar'], includeTimelion: true });
  features.forEach((featureConfig) => {
    it(`returns the ${featureConfig.id} feature augmented with appropriate sub feature privileges`, () => {
      const privileges = [];
      for (const featurePrivilege of featurePrivilegeIterator(new Feature(featureConfig), {
        augmentWithSubFeaturePrivileges: true,
      })) {
        privileges.push(featurePrivilege);
      }
      expect(privileges).toMatchSnapshot();
    });
  });
});
