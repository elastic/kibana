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

    const actualPrivileges = Array.from(
      featurePrivilegeIterator(feature, {
        augmentWithSubFeaturePrivileges: true,
      })
    );

    expect(actualPrivileges).toHaveLength(0);
  });

  it('handles features with no sub-features', () => {
    const feature = new Feature({
      id: 'foo',
      name: 'foo',
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
          ui: ['ui-action'],
        },
      },
      app: ['foo'],
    });

    const actualPrivileges = Array.from(
      featurePrivilegeIterator(feature, {
        augmentWithSubFeaturePrivileges: true,
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
          ui: ['ui-action'],
        },
      },
      app: ['foo'],
    });

    const actualPrivileges = Array.from(
      featurePrivilegeIterator(feature, {
        augmentWithSubFeaturePrivileges: true,
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
          ui: ['ui-action', 'ui-sub-type'],
        },
      },
    ]);
  });

  it('does not duplicate privileges when merging', () => {
    const feature = new Feature({
      id: 'foo',
      name: 'foo',
      app: [],
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
          ui: ['ui-action'],
        },
      },
    ]);
  });

  it('includes sub feature privileges into both all and read when`augmentWithSubFeaturePrivileges` is true and `includeIn: all`', () => {
    const feature = new Feature({
      id: 'foo',
      name: 'foo',
      app: [],
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
          ui: ['ui-action'],
        },
      },
    ]);
  });

  it(`can augment primary feature privileges even if they don't specify their own`, () => {
    const feature = new Feature({
      id: 'foo',
      name: 'foo',
      app: [],
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
          ui: ['ui-sub-type'],
        },
      },
    ]);
  });

  it(`can augment primary feature privileges even if the sub-feature privileges don't specify their own`, () => {
    const feature = new Feature({
      id: 'foo',
      name: 'foo',
      app: [],
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
          ui: ['ui-action'],
        },
      },
    ]);
  });
});
