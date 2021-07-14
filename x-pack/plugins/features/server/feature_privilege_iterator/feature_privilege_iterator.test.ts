/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaFeature } from '../';
import { featurePrivilegeIterator } from './feature_privilege_iterator';

describe('featurePrivilegeIterator', () => {
  it('handles features with no privileges', () => {
    const feature = new KibanaFeature({
      id: 'foo',
      name: 'foo',
      privileges: null,
      app: [],
      category: { id: 'foo', label: 'foo' },
    });

    const actualPrivileges = Array.from(
      featurePrivilegeIterator(feature, {
        augmentWithSubFeaturePrivileges: true,
        licenseType: 'basic',
      })
    );

    expect(actualPrivileges).toHaveLength(0);
  });

  it('handles features with no sub-features', () => {
    const feature = new KibanaFeature({
      id: 'foo',
      name: 'foo',
      category: { id: 'foo', label: 'foo' },
      privileges: {
        all: {
          api: ['all-api', 'read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: ['all-type'],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              all: ['alerting-all-type'],
              read: ['alerting-read-type'],
            },
            alert: {
              all: ['alerting-all-type'],
              read: [],
            },
          },
          cases: {
            all: ['cases-all-type'],
            read: ['cases-read-type'],
          },
          ui: ['ui-action'],
        },
        read: {
          api: ['read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: [],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              read: ['alerting-read-type'],
            },
            alert: {
              read: ['alerting-read-type'],
            },
          },
          cases: {
            read: ['cases-read-type'],
          },
          ui: ['ui-action'],
        },
      },
      app: ['foo'],
    });

    const actualPrivileges = Array.from(
      featurePrivilegeIterator(feature, {
        augmentWithSubFeaturePrivileges: true,
        licenseType: 'basic',
      })
    );

    expect(actualPrivileges).toEqual([
      {
        privilegeId: 'all',
        privilege: {
          api: ['all-api', 'read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: ['all-type'],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              all: ['alerting-all-type'],
              read: ['alerting-read-type'],
            },
            alert: {
              all: ['alerting-all-type'],
              read: [],
            },
          },
          cases: {
            all: ['cases-all-type'],
            read: ['cases-read-type'],
          },
          ui: ['ui-action'],
        },
      },
      {
        privilegeId: 'read',
        privilege: {
          api: ['read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: [],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              read: ['alerting-read-type'],
            },
            alert: {
              read: ['alerting-read-type'],
            },
          },
          cases: {
            read: ['cases-read-type'],
          },
          ui: ['ui-action'],
        },
      },
    ]);
  });

  it('filters privileges using the provided predicate', () => {
    const feature = new KibanaFeature({
      id: 'foo',
      name: 'foo',
      category: { id: 'foo', label: 'foo' },
      privileges: {
        all: {
          api: ['all-api', 'read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: ['all-type'],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              all: ['alerting-all-type'],
              read: ['alerting-read-type'],
            },
            alert: {
              all: ['alerting-all-type'],
              read: ['alerting-read-type-alerts'],
            },
          },
          cases: {
            all: ['cases-all-type'],
            read: ['cases-read-type'],
          },
          ui: ['ui-action'],
        },
        read: {
          api: ['read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: [],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              read: ['alerting-read-type'],
            },
            alert: {
              read: ['alerting-read-type'],
            },
          },
          cases: {
            read: ['cases-read-type'],
          },
          ui: ['ui-action'],
        },
      },
      app: ['foo'],
    });

    const actualPrivileges = Array.from(
      featurePrivilegeIterator(feature, {
        augmentWithSubFeaturePrivileges: true,
        licenseType: 'basic',
        predicate: (privilegeId) => privilegeId === 'all',
      })
    );

    expect(actualPrivileges).toEqual([
      {
        privilegeId: 'all',
        privilege: {
          api: ['all-api', 'read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: ['all-type'],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              all: ['alerting-all-type'],
              read: ['alerting-read-type'],
            },
            alert: {
              all: ['alerting-all-type'],
              read: ['alerting-read-type-alerts'],
            },
          },
          cases: {
            all: ['cases-all-type'],
            read: ['cases-read-type'],
          },
          ui: ['ui-action'],
        },
      },
    ]);
  });

  it('ignores sub features when `augmentWithSubFeaturePrivileges` is false', () => {
    const feature = new KibanaFeature({
      id: 'foo',
      name: 'foo',
      app: [],
      category: { id: 'foo', label: 'foo' },
      privileges: {
        all: {
          api: ['all-api', 'read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: ['all-type'],
            read: [],
          },
          alerting: {
            rule: {
              all: ['alerting-all-type'],
            },
            alert: {
              read: ['alerting-another-read-type'],
            },
          },
          cases: {
            all: ['cases-all-type'],
            read: ['cases-read-type'],
          },
          ui: ['ui-action'],
        },
        read: {
          api: ['read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: [],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              read: ['alerting-read-type'],
            },
            alert: {
              read: ['alerting-read-type'],
            },
          },
          cases: {
            read: ['cases-read-type'],
          },
          ui: ['ui-action'],
        },
      },
      subFeatures: [
        {
          name: 'sub feature 1',
          privilegeGroups: [
            {
              groupType: 'independent',
              privileges: [
                {
                  id: 'sub-feature-priv-1',
                  name: 'first sub feature privilege',
                  includeIn: 'read',
                  api: ['sub-feature-api'],
                  app: ['sub-app'],
                  catalogue: ['sub-catalogue'],
                  management: {
                    kibana: ['sub-management'],
                  },
                  savedObject: {
                    all: ['all-sub-type'],
                    read: ['read-sub-type'],
                  },
                  alerting: {
                    alert: {
                      all: ['alerting-all-sub-type'],
                    },
                  },
                  cases: {
                    all: ['cases-all-sub-type'],
                    read: ['cases-read-sub-type'],
                  },
                  ui: ['ui-sub-type'],
                },
              ],
            },
          ],
        },
      ],
    });

    const actualPrivileges = Array.from(
      featurePrivilegeIterator(feature, {
        augmentWithSubFeaturePrivileges: false,
        licenseType: 'basic',
      })
    );

    expect(actualPrivileges).toEqual([
      {
        privilegeId: 'all',
        privilege: {
          api: ['all-api', 'read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: ['all-type'],
            read: [],
          },
          alerting: {
            rule: {
              all: ['alerting-all-type'],
            },
            alert: {
              read: ['alerting-another-read-type'],
            },
          },
          cases: {
            all: ['cases-all-type'],
            read: ['cases-read-type'],
          },
          ui: ['ui-action'],
        },
      },
      {
        privilegeId: 'read',
        privilege: {
          api: ['read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: [],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              read: ['alerting-read-type'],
            },
            alert: {
              read: ['alerting-read-type'],
            },
          },
          cases: {
            read: ['cases-read-type'],
          },
          ui: ['ui-action'],
        },
      },
    ]);
  });

  it('ignores sub features when `includeIn` is none, even if `augmentWithSubFeaturePrivileges` is true', () => {
    const feature = new KibanaFeature({
      id: 'foo',
      name: 'foo',
      app: [],
      category: { id: 'foo', label: 'foo' },
      privileges: {
        all: {
          api: ['all-api', 'read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: ['all-type'],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              all: ['alerting-all-type'],
            },
            alert: {
              read: ['alerting-another-read-type'],
            },
          },
          cases: {
            all: ['cases-all-type'],
            read: ['cases-read-type'],
          },
          ui: ['ui-action'],
        },
        read: {
          api: ['read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: [],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              read: ['alerting-read-type'],
            },
            alert: {
              read: ['alerting-read-type'],
            },
          },
          cases: {
            read: ['cases-read-type'],
          },
          ui: ['ui-action'],
        },
      },
      subFeatures: [
        {
          name: 'sub feature 1',
          privilegeGroups: [
            {
              groupType: 'independent',
              privileges: [
                {
                  id: 'sub-feature-priv-1',
                  name: 'first sub feature privilege',
                  includeIn: 'none',
                  api: ['sub-feature-api'],
                  app: ['sub-app'],
                  catalogue: ['sub-catalogue'],
                  management: {
                    kibana: ['sub-management'],
                  },
                  savedObject: {
                    all: ['all-sub-type'],
                    read: ['read-sub-type'],
                  },
                  alerting: {
                    alert: {
                      all: ['alerting-all-sub-type'],
                    },
                  },
                  cases: {
                    all: ['cases-all-sub-type'],
                    read: ['cases-read-sub-type'],
                  },
                  ui: ['ui-sub-type'],
                },
              ],
            },
          ],
        },
      ],
    });

    const actualPrivileges = Array.from(
      featurePrivilegeIterator(feature, {
        augmentWithSubFeaturePrivileges: true,
        licenseType: 'basic',
      })
    );

    expect(actualPrivileges).toEqual([
      {
        privilegeId: 'all',
        privilege: {
          api: ['all-api', 'read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: ['all-type'],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              all: ['alerting-all-type'],
            },
            alert: {
              read: ['alerting-another-read-type'],
            },
          },
          cases: {
            all: ['cases-all-type'],
            read: ['cases-read-type'],
          },
          ui: ['ui-action'],
        },
      },
      {
        privilegeId: 'read',
        privilege: {
          api: ['read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: [],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              read: ['alerting-read-type'],
            },
            alert: {
              read: ['alerting-read-type'],
            },
          },
          cases: {
            read: ['cases-read-type'],
          },
          ui: ['ui-action'],
        },
      },
    ]);
  });

  it('includes sub feature privileges into both all and read when`augmentWithSubFeaturePrivileges` is true and `includeIn: read`', () => {
    const feature = new KibanaFeature({
      id: 'foo',
      name: 'foo',
      app: [],
      category: { id: 'foo', label: 'foo' },
      privileges: {
        all: {
          api: ['all-api', 'read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: ['all-type'],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              all: ['alerting-all-type'],
            },
            alert: {
              read: ['alerting-another-read-type'],
            },
          },
          cases: {
            all: ['cases-all-type'],
            read: ['cases-read-type'],
          },
          ui: ['ui-action'],
        },
        read: {
          api: ['read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: [],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              read: ['alerting-read-type'],
            },
            alert: {
              read: ['alerting-read-type'],
            },
          },
          cases: {
            read: ['cases-read-type'],
          },
          ui: ['ui-action'],
        },
      },
      subFeatures: [
        {
          name: 'sub feature 1',
          privilegeGroups: [
            {
              groupType: 'independent',
              privileges: [
                {
                  id: 'sub-feature-priv-1',
                  name: 'first sub feature privilege',
                  includeIn: 'read',
                  api: ['sub-feature-api'],
                  app: ['sub-app'],
                  catalogue: ['sub-catalogue'],
                  management: {
                    section: ['other-sub-management'],
                    kibana: ['sub-management'],
                  },
                  savedObject: {
                    all: ['all-sub-type'],
                    read: ['read-sub-type'],
                  },
                  alerting: {
                    alert: {
                      all: ['alerting-all-sub-type'],
                    },
                  },
                  cases: {
                    all: ['cases-all-sub-type'],
                    read: ['cases-read-sub-type'],
                  },
                  ui: ['ui-sub-type'],
                },
              ],
            },
          ],
        },
      ],
    });

    const actualPrivileges = Array.from(
      featurePrivilegeIterator(feature, {
        augmentWithSubFeaturePrivileges: true,
        licenseType: 'basic',
      })
    );

    expect(actualPrivileges).toEqual([
      {
        privilegeId: 'all',
        privilege: {
          api: ['all-api', 'read-api', 'sub-feature-api'],
          app: ['foo', 'sub-app'],
          catalogue: ['foo-catalogue', 'sub-catalogue'],
          management: {
            section: ['foo-management', 'other-sub-management'],
            kibana: ['sub-management'],
          },
          savedObject: {
            all: ['all-type', 'all-sub-type'],
            read: ['read-type', 'read-sub-type'],
          },
          alerting: {
            rule: {
              all: ['alerting-all-type'],
              read: [],
            },
            alert: {
              all: ['alerting-all-sub-type'],
              read: ['alerting-another-read-type'],
            },
          },
          cases: {
            all: ['cases-all-type', 'cases-all-sub-type'],
            read: ['cases-read-type', 'cases-read-sub-type'],
          },
          ui: ['ui-action', 'ui-sub-type'],
        },
      },
      {
        privilegeId: 'read',
        privilege: {
          api: ['read-api', 'sub-feature-api'],
          app: ['foo', 'sub-app'],
          catalogue: ['foo-catalogue', 'sub-catalogue'],
          management: {
            section: ['foo-management', 'other-sub-management'],
            kibana: ['sub-management'],
          },
          savedObject: {
            all: ['all-sub-type'],
            read: ['read-type', 'read-sub-type'],
          },
          alerting: {
            rule: {
              all: [],
              read: ['alerting-read-type'],
            },
            alert: {
              all: ['alerting-all-sub-type'],
              read: ['alerting-read-type'],
            },
          },
          cases: {
            all: ['cases-all-sub-type'],
            read: ['cases-read-type', 'cases-read-sub-type'],
          },
          ui: ['ui-action', 'ui-sub-type'],
        },
      },
    ]);
  });

  it('does not duplicate privileges when merging', () => {
    const feature = new KibanaFeature({
      id: 'foo',
      name: 'foo',
      app: [],
      category: { id: 'foo', label: 'foo' },
      privileges: {
        all: {
          api: ['all-api', 'read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: ['all-type'],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              all: ['alerting-all-type'],
              read: ['alerting-read-type'],
            },
            alert: {
              all: [],
              read: ['alerting-read-type'],
            },
          },
          cases: {
            all: ['cases-all-type'],
            read: ['cases-read-type'],
          },
          ui: ['ui-action'],
        },
        read: {
          api: ['read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: [],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              read: ['alerting-read-type'],
            },
            alert: {
              read: ['alerting-read-type'],
            },
          },
          cases: {
            read: ['cases-read-type'],
          },
          ui: ['ui-action'],
        },
      },
      subFeatures: [
        {
          name: 'sub feature 1',
          privilegeGroups: [
            {
              groupType: 'independent',
              privileges: [
                {
                  id: 'sub-feature-priv-1',
                  name: 'first sub feature privilege',
                  includeIn: 'read',
                  api: ['read-api'],
                  app: ['foo'],
                  catalogue: ['foo-catalogue'],
                  management: {
                    section: ['foo-management'],
                  },
                  savedObject: {
                    all: [],
                    read: ['read-type'],
                  },
                  alerting: {
                    alert: {
                      all: ['alerting-read-type'],
                    },
                  },
                  cases: {
                    read: ['cases-read-type'],
                  },
                  ui: ['ui-action'],
                },
              ],
            },
          ],
        },
      ],
    });

    const actualPrivileges = Array.from(
      featurePrivilegeIterator(feature, {
        augmentWithSubFeaturePrivileges: true,
        licenseType: 'basic',
      })
    );

    expect(actualPrivileges).toEqual([
      {
        privilegeId: 'all',
        privilege: {
          api: ['all-api', 'read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: ['all-type'],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              all: ['alerting-all-type'],
              read: ['alerting-read-type'],
            },
            alert: {
              all: ['alerting-read-type'],
              read: ['alerting-read-type'],
            },
          },
          cases: {
            all: ['cases-all-type'],
            read: ['cases-read-type'],
          },
          ui: ['ui-action'],
        },
      },
      {
        privilegeId: 'read',
        privilege: {
          api: ['read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: [],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              all: [],
              read: ['alerting-read-type'],
            },
            alert: {
              all: ['alerting-read-type'],
              read: ['alerting-read-type'],
            },
          },
          cases: {
            all: [],
            read: ['cases-read-type'],
          },
          ui: ['ui-action'],
        },
      },
    ]);
  });

  it('includes sub feature privileges into both all and read when`augmentWithSubFeaturePrivileges` is true and `includeIn: all`', () => {
    const feature = new KibanaFeature({
      id: 'foo',
      name: 'foo',
      app: [],
      category: { id: 'foo', label: 'foo' },
      privileges: {
        all: {
          api: ['all-api', 'read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: ['all-type'],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              all: ['alerting-all-type'],
            },
            alert: {
              read: ['alerting-another-read-type'],
            },
          },
          cases: {
            all: ['cases-all-type'],
            read: ['cases-read-type'],
          },
          ui: ['ui-action'],
        },
        read: {
          api: ['read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: [],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              read: ['alerting-read-type'],
            },
            alert: {
              read: ['alerting-read-type'],
            },
          },
          cases: {
            read: ['cases-read-type'],
          },
          ui: ['ui-action'],
        },
      },
      subFeatures: [
        {
          name: 'sub feature 1',
          privilegeGroups: [
            {
              groupType: 'independent',
              privileges: [
                {
                  id: 'sub-feature-priv-1',
                  name: 'first sub feature privilege',
                  includeIn: 'all',
                  api: ['sub-feature-api'],
                  app: ['sub-app'],
                  catalogue: ['sub-catalogue'],
                  management: {
                    section: ['other-sub-management'],
                    kibana: ['sub-management'],
                  },
                  savedObject: {
                    all: ['all-sub-type'],
                    read: ['read-sub-type'],
                  },
                  alerting: {
                    alert: {
                      all: ['alerting-all-sub-type'],
                    },
                  },
                  cases: {
                    all: ['cases-all-sub-type'],
                    read: ['cases-read-sub-type'],
                  },
                  ui: ['ui-sub-type'],
                },
              ],
            },
          ],
        },
      ],
    });

    const actualPrivileges = Array.from(
      featurePrivilegeIterator(feature, {
        augmentWithSubFeaturePrivileges: true,
        licenseType: 'basic',
      })
    );

    expect(actualPrivileges).toEqual([
      {
        privilegeId: 'all',
        privilege: {
          api: ['all-api', 'read-api', 'sub-feature-api'],
          app: ['foo', 'sub-app'],
          catalogue: ['foo-catalogue', 'sub-catalogue'],
          management: {
            section: ['foo-management', 'other-sub-management'],
            kibana: ['sub-management'],
          },
          savedObject: {
            all: ['all-type', 'all-sub-type'],
            read: ['read-type', 'read-sub-type'],
          },
          alerting: {
            rule: {
              all: ['alerting-all-type'],
              read: [],
            },
            alert: {
              all: ['alerting-all-sub-type'],
              read: ['alerting-another-read-type'],
            },
          },
          cases: {
            all: ['cases-all-type', 'cases-all-sub-type'],
            read: ['cases-read-type', 'cases-read-sub-type'],
          },
          ui: ['ui-action', 'ui-sub-type'],
        },
      },
      {
        privilegeId: 'read',
        privilege: {
          api: ['read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: [],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              read: ['alerting-read-type'],
            },
            alert: {
              read: ['alerting-read-type'],
            },
          },
          cases: {
            read: ['cases-read-type'],
          },
          ui: ['ui-action'],
        },
      },
    ]);
  });

  it('excludes sub feature privileges when the minimum license is not met', () => {
    const feature = new KibanaFeature({
      id: 'foo',
      name: 'foo',
      app: [],
      category: { id: 'foo', label: 'foo' },
      privileges: {
        all: {
          api: ['all-api', 'read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: ['all-type'],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              all: ['alerting-all-type'],
            },
            alert: {
              read: ['alerting-another-read-type'],
            },
          },
          cases: {
            all: ['cases-all-type'],
            read: ['cases-read-type'],
          },
          ui: ['ui-action'],
        },
        read: {
          api: ['read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: [],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              read: ['alerting-read-type'],
            },
            alert: {
              read: ['alerting-read-type'],
            },
          },
          cases: {
            read: ['cases-read-type'],
          },
          ui: ['ui-action'],
        },
      },
      subFeatures: [
        {
          name: 'sub feature 1',
          privilegeGroups: [
            {
              groupType: 'independent',
              privileges: [
                {
                  id: 'sub-feature-priv-1',
                  name: 'first sub feature privilege',
                  includeIn: 'all',
                  minimumLicense: 'gold',
                  api: ['sub-feature-api'],
                  app: ['sub-app'],
                  catalogue: ['sub-catalogue'],
                  management: {
                    section: ['other-sub-management'],
                    kibana: ['sub-management'],
                  },
                  savedObject: {
                    all: ['all-sub-type'],
                    read: ['read-sub-type'],
                  },
                  alerting: {
                    alert: {
                      all: ['alerting-all-sub-type'],
                    },
                  },
                  cases: {
                    all: ['cases-all-sub-type'],
                    read: ['cases-read-sub-type'],
                  },
                  ui: ['ui-sub-type'],
                },
              ],
            },
          ],
        },
      ],
    });

    const actualPrivileges = Array.from(
      featurePrivilegeIterator(feature, {
        augmentWithSubFeaturePrivileges: true,
        licenseType: 'basic',
      })
    );

    expect(actualPrivileges).toEqual([
      {
        privilegeId: 'all',
        privilege: {
          api: ['all-api', 'read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: ['all-type'],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              all: ['alerting-all-type'],
            },
            alert: {
              read: ['alerting-another-read-type'],
            },
          },
          cases: {
            all: ['cases-all-type'],
            read: ['cases-read-type'],
          },
          ui: ['ui-action'],
        },
      },
      {
        privilegeId: 'read',
        privilege: {
          api: ['read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: [],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              read: ['alerting-read-type'],
            },
            alert: {
              read: ['alerting-read-type'],
            },
          },
          cases: {
            read: ['cases-read-type'],
          },
          ui: ['ui-action'],
        },
      },
    ]);
  });

  it(`can augment primary feature privileges even if they don't specify their own`, () => {
    const feature = new KibanaFeature({
      id: 'foo',
      name: 'foo',
      app: [],
      category: { id: 'foo', label: 'foo' },
      privileges: {
        all: {
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
        read: {
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        },
      },
      subFeatures: [
        {
          name: 'sub feature 1',
          privilegeGroups: [
            {
              groupType: 'independent',
              privileges: [
                {
                  id: 'sub-feature-priv-1',
                  name: 'first sub feature privilege',
                  includeIn: 'read',
                  api: ['sub-feature-api'],
                  app: ['sub-app'],
                  catalogue: ['sub-catalogue'],
                  management: {
                    section: ['other-sub-management'],
                    kibana: ['sub-management'],
                  },
                  savedObject: {
                    all: ['all-sub-type'],
                    read: ['read-sub-type'],
                  },
                  alerting: {
                    rule: {
                      all: ['alerting-all-sub-type'],
                      read: ['alerting-read-sub-type'],
                    },
                  },
                  cases: {
                    all: ['cases-all-sub-type'],
                    read: ['cases-read-sub-type'],
                  },
                  ui: ['ui-sub-type'],
                },
              ],
            },
          ],
        },
      ],
    });

    const actualPrivileges = Array.from(
      featurePrivilegeIterator(feature, {
        augmentWithSubFeaturePrivileges: true,
        licenseType: 'basic',
      })
    );

    expect(actualPrivileges).toEqual([
      {
        privilegeId: 'all',
        privilege: {
          api: ['sub-feature-api'],
          app: ['sub-app'],
          catalogue: ['sub-catalogue'],
          management: {
            section: ['other-sub-management'],
            kibana: ['sub-management'],
          },
          savedObject: {
            all: ['all-sub-type'],
            read: ['read-sub-type'],
          },
          alerting: {
            rule: {
              all: ['alerting-all-sub-type'],
              read: ['alerting-read-sub-type'],
            },
            alert: {
              all: [],
              read: [],
            },
          },
          cases: {
            all: ['cases-all-sub-type'],
            read: ['cases-read-sub-type'],
          },
          ui: ['ui-sub-type'],
        },
      },
      {
        privilegeId: 'read',
        privilege: {
          api: ['sub-feature-api'],
          app: ['sub-app'],
          catalogue: ['sub-catalogue'],
          management: {
            section: ['other-sub-management'],
            kibana: ['sub-management'],
          },
          savedObject: {
            all: ['all-sub-type'],
            read: ['read-sub-type'],
          },
          alerting: {
            rule: {
              all: ['alerting-all-sub-type'],
              read: ['alerting-read-sub-type'],
            },
            alert: {
              all: [],
              read: [],
            },
          },
          cases: {
            all: ['cases-all-sub-type'],
            read: ['cases-read-sub-type'],
          },
          ui: ['ui-sub-type'],
        },
      },
    ]);
  });

  it(`can augment primary feature privileges even if the sub-feature privileges don't specify their own`, () => {
    const feature = new KibanaFeature({
      id: 'foo',
      name: 'foo',
      app: [],
      category: { id: 'foo', label: 'foo' },
      privileges: {
        all: {
          api: ['all-api', 'read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: ['all-type'],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              all: ['alerting-all-type'],
            },
            alert: {
              read: ['alerting-another-read-type'],
            },
          },
          cases: {
            all: ['cases-all-type'],
            read: ['cases-read-type'],
          },
          ui: ['ui-action'],
        },
        read: {
          api: ['read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: [],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              read: ['alerting-read-type'],
            },
            alert: {
              read: ['alerting-read-type'],
            },
          },
          cases: {
            read: ['cases-read-type'],
          },
          ui: ['ui-action'],
        },
      },
      subFeatures: [
        {
          name: 'sub feature 1',
          privilegeGroups: [
            {
              groupType: 'independent',
              privileges: [
                {
                  id: 'sub-feature-priv-1',
                  name: 'first sub feature privilege',
                  includeIn: 'read',
                  savedObject: {
                    all: [],
                    read: [],
                  },
                  ui: [],
                },
              ],
            },
          ],
        },
      ],
    });

    const actualPrivileges = Array.from(
      featurePrivilegeIterator(feature, {
        augmentWithSubFeaturePrivileges: true,
        licenseType: 'basic',
      })
    );

    expect(actualPrivileges).toEqual([
      {
        privilegeId: 'all',
        privilege: {
          api: ['all-api', 'read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: ['all-type'],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              all: ['alerting-all-type'],
              read: [],
            },
            alert: {
              all: [],
              read: ['alerting-another-read-type'],
            },
          },
          cases: {
            all: ['cases-all-type'],
            read: ['cases-read-type'],
          },
          ui: ['ui-action'],
        },
      },
      {
        privilegeId: 'read',
        privilege: {
          api: ['read-api'],
          app: ['foo'],
          catalogue: ['foo-catalogue'],
          management: {
            section: ['foo-management'],
          },
          savedObject: {
            all: [],
            read: ['read-type'],
          },
          alerting: {
            rule: {
              all: [],
              read: ['alerting-read-type'],
            },
            alert: {
              all: [],
              read: ['alerting-read-type'],
            },
          },
          cases: {
            all: [],
            read: ['cases-read-type'],
          },
          ui: ['ui-action'],
        },
      },
    ]);
  });
});
