/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Feature } from '../../../../../features/server';
import { featurePrivilegeIterator } from './feature_privilege_iterator';

describe('featurePrivilegeIterator', () => {
  it('handles features with no privileges', () => {
    const feature = new Feature({
      id: 'foo',
      name: 'foo',
      privileges: null,
      app: [],
    });

    const actualPrivileges = [];
    for (const privilege of featurePrivilegeIterator(feature, {
      augmentWithSubFeaturePrivileges: true,
    })) {
      actualPrivileges.push(privilege);
    }

    expect(actualPrivileges).toHaveLength(0);
  });

  it('handles features with no sub-features', () => {
    const feature = new Feature({
      id: 'foo',
      name: 'foo',
      privileges: {
        all: {
          savedObject: {
            all: ['all-type'],
            read: ['read-type'],
          },
          ui: ['ui-action'],
        },
        read: {
          savedObject: {
            all: [],
            read: ['read-type'],
          },
          ui: ['ui-action'],
        },
      },
      app: [],
    });

    const actualPrivileges = [];
    for (const privilege of featurePrivilegeIterator(feature, {
      augmentWithSubFeaturePrivileges: true,
    })) {
      actualPrivileges.push(privilege);
    }

    expect(actualPrivileges).toEqual([
      {
        privilegeId: 'all',
        privilege: {
          savedObject: {
            all: ['all-type'],
            read: ['read-type'],
          },
          ui: ['ui-action'],
        },
      },
      {
        privilegeId: 'read',
        privilege: {
          savedObject: {
            all: [],
            read: ['read-type'],
          },
          ui: ['ui-action'],
        },
      },
    ]);
  });

  it('filters privileges using the provided predicate', () => {
    const feature = new Feature({
      id: 'foo',
      name: 'foo',
      privileges: {
        all: {
          savedObject: {
            all: ['all-type'],
            read: ['read-type'],
          },
          ui: ['ui-action'],
        },
        read: {
          savedObject: {
            all: [],
            read: ['read-type'],
          },
          ui: ['ui-action'],
        },
      },
      app: [],
    });

    const actualPrivileges = [];
    for (const privilege of featurePrivilegeIterator(feature, {
      augmentWithSubFeaturePrivileges: true,
      predicate: privilegeId => privilegeId === 'all',
    })) {
      actualPrivileges.push(privilege);
    }

    expect(actualPrivileges).toEqual([
      {
        privilegeId: 'all',
        privilege: {
          savedObject: {
            all: ['all-type'],
            read: ['read-type'],
          },
          ui: ['ui-action'],
        },
      },
    ]);
  });

  it('ignores sub features when `augmentWithSubFeaturePrivileges` is false', () => {
    const feature = new Feature({
      id: 'foo',
      name: 'foo',
      app: [],
      privileges: {
        all: {
          savedObject: {
            all: ['all-type'],
            read: ['read-type'],
          },
          ui: ['ui-action'],
        },
        read: {
          savedObject: {
            all: [],
            read: ['read-type'],
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
                    all: ['all-sub-type'],
                    read: ['read-sub-type'],
                  },
                  ui: ['ui-sub-type'],
                  app: ['sub-app'],
                  catalogue: ['sub-catalogue'],
                  management: {
                    kibana: ['sub-management'],
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    const actualPrivileges = [];
    for (const privilege of featurePrivilegeIterator(feature, {
      augmentWithSubFeaturePrivileges: false,
    })) {
      actualPrivileges.push(privilege);
    }

    expect(actualPrivileges).toEqual([
      {
        privilegeId: 'all',
        privilege: {
          savedObject: {
            all: ['all-type'],
            read: ['read-type'],
          },
          ui: ['ui-action'],
        },
      },
      {
        privilegeId: 'read',
        privilege: {
          savedObject: {
            all: [],
            read: ['read-type'],
          },
          ui: ['ui-action'],
        },
      },
    ]);
  });

  it('ignores sub features when `includeIn` is none, even if `augmentWithSubFeaturePrivileges` is true', () => {
    const feature = new Feature({
      id: 'foo',
      name: 'foo',
      app: [],
      privileges: {
        all: {
          savedObject: {
            all: ['all-type'],
            read: ['read-type'],
          },
          ui: ['ui-action'],
        },
        read: {
          savedObject: {
            all: [],
            read: ['read-type'],
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
                  savedObject: {
                    all: ['all-sub-type'],
                    read: ['read-sub-type'],
                  },
                  ui: ['ui-sub-type'],
                  app: ['sub-app'],
                  catalogue: ['sub-catalogue'],
                  management: {
                    kibana: ['sub-management'],
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    const actualPrivileges = [];
    for (const privilege of featurePrivilegeIterator(feature, {
      augmentWithSubFeaturePrivileges: true,
    })) {
      actualPrivileges.push(privilege);
    }

    expect(actualPrivileges).toEqual([
      {
        privilegeId: 'all',
        privilege: {
          savedObject: {
            all: ['all-type'],
            read: ['read-type'],
          },
          ui: ['ui-action'],
        },
      },
      {
        privilegeId: 'read',
        privilege: {
          savedObject: {
            all: [],
            read: ['read-type'],
          },
          ui: ['ui-action'],
        },
      },
    ]);
  });

  it('includes sub feature privileges into both all and read when`augmentWithSubFeaturePrivileges` is true and `includeIn: read`', () => {
    const feature = new Feature({
      id: 'foo',
      name: 'foo',
      app: [],
      privileges: {
        all: {
          savedObject: {
            all: ['all-type'],
            read: ['read-type'],
          },
          ui: ['ui-action'],
        },
        read: {
          savedObject: {
            all: [],
            read: ['read-type'],
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
                    all: ['all-sub-type'],
                    read: ['read-sub-type'],
                  },
                  ui: ['ui-sub-type'],
                  app: ['sub-app'],
                  api: ['sub-api'],
                  catalogue: ['sub-catalogue'],
                  management: {
                    kibana: ['sub-management'],
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    const actualPrivileges = [];
    for (const privilege of featurePrivilegeIterator(feature, {
      augmentWithSubFeaturePrivileges: true,
    })) {
      actualPrivileges.push(privilege);
    }

    expect(actualPrivileges).toEqual([
      {
        privilegeId: 'all',
        privilege: {
          savedObject: {
            all: ['all-type', 'all-sub-type'],
            read: ['read-type', 'read-sub-type'],
          },
          ui: ['ui-action', 'ui-sub-type'],
          app: ['sub-app'],
          api: ['sub-api'],
          catalogue: ['sub-catalogue'],
          management: {
            kibana: ['sub-management'],
          },
        },
      },
      {
        privilegeId: 'read',
        privilege: {
          savedObject: {
            all: ['all-sub-type'],
            read: ['read-type', 'read-sub-type'],
          },
          ui: ['ui-action', 'ui-sub-type'],
          app: ['sub-app'],
          api: ['sub-api'],
          catalogue: ['sub-catalogue'],
          management: {
            kibana: ['sub-management'],
          },
        },
      },
    ]);
  });

  it('includes sub feature privileges into all when`augmentWithSubFeaturePrivileges` is true and `includeIn: all`', () => {
    const feature = new Feature({
      id: 'foo',
      name: 'foo',
      app: [],
      privileges: {
        all: {
          savedObject: {
            all: ['all-type'],
            read: ['read-type'],
          },
          ui: ['ui-action'],
        },
        read: {
          savedObject: {
            all: [],
            read: ['read-type'],
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
                  savedObject: {
                    all: ['all-sub-type'],
                    read: ['read-sub-type'],
                  },
                  ui: ['ui-sub-type'],
                  app: ['sub-app'],
                  api: ['sub-api'],
                  catalogue: ['sub-catalogue'],
                  management: {
                    kibana: ['sub-management'],
                  },
                },
              ],
            },
          ],
        },
      ],
    });

    const actualPrivileges = [];
    for (const privilege of featurePrivilegeIterator(feature, {
      augmentWithSubFeaturePrivileges: true,
    })) {
      actualPrivileges.push(privilege);
    }

    expect(actualPrivileges).toEqual([
      {
        privilegeId: 'all',
        privilege: {
          savedObject: {
            all: ['all-type', 'all-sub-type'],
            read: ['read-type', 'read-sub-type'],
          },
          ui: ['ui-action', 'ui-sub-type'],
          app: ['sub-app'],
          api: ['sub-api'],
          catalogue: ['sub-catalogue'],
          management: {
            kibana: ['sub-management'],
          },
        },
      },
      {
        privilegeId: 'read',
        privilege: {
          savedObject: {
            all: [],
            read: ['read-type'],
          },
          ui: ['ui-action'],
        },
      },
    ]);
  });
});
