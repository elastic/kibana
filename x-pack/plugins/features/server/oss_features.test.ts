/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildOSSFeatures } from './oss_features';
import { featurePrivilegeIterator } from './feature_privilege_iterator';
import { KibanaFeature } from '.';
import { LicenseType } from '../../licensing/server';

describe('buildOSSFeatures', () => {
  it('returns features including timelion', () => {
    expect(
      buildOSSFeatures({
        savedObjectTypes: ['foo', 'bar'],
        includeTimelion: true,
        includeReporting: false,
      }).map((f) => f.id)
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
      buildOSSFeatures({
        savedObjectTypes: ['foo', 'bar'],
        includeTimelion: false,
        includeReporting: false,
      }).map((f) => f.id)
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

  it('returns features including reporting subfeatures', () => {
    expect(
      buildOSSFeatures({
        savedObjectTypes: ['foo', 'bar'],
        includeTimelion: false,
        includeReporting: true,
      }).map(({ id, subFeatures }) => ({ id, subFeatures }))
    ).toMatchSnapshot();
  });

  it('returns features excluding reporting subfeatures', () => {
    expect(
      buildOSSFeatures({
        savedObjectTypes: ['foo', 'bar'],
        includeTimelion: false,
        includeReporting: false,
      }).map(({ id, subFeatures }) => ({ id, subFeatures }))
    ).toMatchSnapshot();
  });

  const features = buildOSSFeatures({
    savedObjectTypes: ['foo', 'bar'],
    includeTimelion: true,
    includeReporting: false,
  });
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
