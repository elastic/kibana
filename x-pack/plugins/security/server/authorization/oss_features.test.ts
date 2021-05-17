/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaFeature } from '../../../features/server';
import { buildOSSFeatures } from '../../../features/server/oss_features';
import type { LicenseType } from '../../../licensing/server';
import { featurePrivilegeIterator } from './privileges';

describe('OSS Features', () => {
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
