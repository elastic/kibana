/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { buildOSSFeatures } from './oss_features';
// @ts-expect-error
import { featurePrivilegeIterator } from './feature_privilege_iterator';
import { KibanaFeature } from '.';
import { LicenseType } from '../../licensing/server';

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
    (['enterprise', 'basic'] as LicenseType[]).forEach((licenseType) => {
      describe(`with a ${licenseType} license`, () => {
        it(`returns the ${featureConfig.id} feature augmented with appropriate sub feature privileges`, () => {
          const privileges = [];
          for (const featurePrivilege of featurePrivilegeIterator(
            new KibanaFeature(featureConfig),
            {
              augmentWithSubFeaturePrivileges: true,
              licenseType,
            }
          )) {
            privileges.push(featurePrivilege);
          }
          expect(privileges).toMatchSnapshot();
        });
      });
    });
  });
});
