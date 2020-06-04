/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Actions } from '../../actions';
import { FeaturePrivilegeAlertingBuilder } from './alerting';
import { Feature, FeatureKibanaPrivileges } from '../../../../../features/server';

const version = '1.0.0-zeta1';

describe(`feature_privilege_builder`, () => {
  describe(`alerting`, () => {
    test('grants no privileges by default', () => {
      const actions = new Actions(version);
      const alertingFeaturePrivileges = new FeaturePrivilegeAlertingBuilder(actions);

      const privilege: FeatureKibanaPrivileges = {
        alerting: {
          all: [],
          read: [],
        },

        savedObject: {
          all: [],
          read: [],
        },
        ui: [],
      };

      const feature = new Feature({
        id: 'my-feature',
        name: 'my-feature',
        app: [],
        privileges: {
          all: privilege,
          read: privilege,
        },
      });

      expect(alertingFeaturePrivileges.getActions(privilege, feature)).toEqual([]);
    });

    describe(`within feature`, () => {
      test('grants `read` privileges under feature consumer', () => {
        const actions = new Actions(version);
        const alertingFeaturePrivileges = new FeaturePrivilegeAlertingBuilder(actions);

        const privilege: FeatureKibanaPrivileges = {
          alerting: {
            all: [],
            read: ['alert-type'],
          },

          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        };

        const feature = new Feature({
          id: 'my-feature',
          name: 'my-feature',
          app: [],
          privileges: {
            all: privilege,
            read: privilege,
          },
        });

        expect(alertingFeaturePrivileges.getActions(privilege, feature)).toMatchInlineSnapshot(`
          Array [
            "alerting:1.0.0-zeta1:alert-type/feature/my-feature/get",
            "alerting:1.0.0-zeta1:alert-type/feature/my-feature/getAlertState",
            "alerting:1.0.0-zeta1:alert-type/feature/my-feature/find",
          ]
        `);
      });

      test('grants `all` privileges under feature consumer', () => {
        const actions = new Actions(version);
        const alertingFeaturePrivileges = new FeaturePrivilegeAlertingBuilder(actions);

        const privilege: FeatureKibanaPrivileges = {
          alerting: {
            all: ['alert-type'],
            read: [],
          },

          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        };

        const feature = new Feature({
          id: 'my-feature',
          name: 'my-feature',
          app: [],
          privileges: {
            all: privilege,
            read: privilege,
          },
        });

        expect(alertingFeaturePrivileges.getActions(privilege, feature)).toMatchInlineSnapshot(`
          Array [
            "alerting:1.0.0-zeta1:alert-type/feature/my-feature/get",
            "alerting:1.0.0-zeta1:alert-type/feature/my-feature/getAlertState",
            "alerting:1.0.0-zeta1:alert-type/feature/my-feature/find",
            "alerting:1.0.0-zeta1:alert-type/feature/my-feature/create",
            "alerting:1.0.0-zeta1:alert-type/feature/my-feature/delete",
            "alerting:1.0.0-zeta1:alert-type/feature/my-feature/update",
            "alerting:1.0.0-zeta1:alert-type/feature/my-feature/updateApiKey",
            "alerting:1.0.0-zeta1:alert-type/feature/my-feature/enable",
            "alerting:1.0.0-zeta1:alert-type/feature/my-feature/disable",
            "alerting:1.0.0-zeta1:alert-type/feature/my-feature/muteAll",
            "alerting:1.0.0-zeta1:alert-type/feature/my-feature/unmuteAll",
            "alerting:1.0.0-zeta1:alert-type/feature/my-feature/muteInstance",
            "alerting:1.0.0-zeta1:alert-type/feature/my-feature/unmuteInstance",
          ]
        `);
      });

      test('grants both `all` and `read` privileges under feature consumer', () => {
        const actions = new Actions(version);
        const alertingFeaturePrivileges = new FeaturePrivilegeAlertingBuilder(actions);

        const privilege: FeatureKibanaPrivileges = {
          alerting: {
            all: ['alert-type'],
            read: ['readonly-alert-type'],
          },

          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        };

        const feature = new Feature({
          id: 'my-feature',
          name: 'my-feature',
          app: [],
          privileges: {
            all: privilege,
            read: privilege,
          },
        });

        expect(alertingFeaturePrivileges.getActions(privilege, feature)).toMatchInlineSnapshot(`
          Array [
            "alerting:1.0.0-zeta1:alert-type/feature/my-feature/get",
            "alerting:1.0.0-zeta1:alert-type/feature/my-feature/getAlertState",
            "alerting:1.0.0-zeta1:alert-type/feature/my-feature/find",
            "alerting:1.0.0-zeta1:alert-type/feature/my-feature/create",
            "alerting:1.0.0-zeta1:alert-type/feature/my-feature/delete",
            "alerting:1.0.0-zeta1:alert-type/feature/my-feature/update",
            "alerting:1.0.0-zeta1:alert-type/feature/my-feature/updateApiKey",
            "alerting:1.0.0-zeta1:alert-type/feature/my-feature/enable",
            "alerting:1.0.0-zeta1:alert-type/feature/my-feature/disable",
            "alerting:1.0.0-zeta1:alert-type/feature/my-feature/muteAll",
            "alerting:1.0.0-zeta1:alert-type/feature/my-feature/unmuteAll",
            "alerting:1.0.0-zeta1:alert-type/feature/my-feature/muteInstance",
            "alerting:1.0.0-zeta1:alert-type/feature/my-feature/unmuteInstance",
            "alerting:1.0.0-zeta1:readonly-alert-type/feature/my-feature/get",
            "alerting:1.0.0-zeta1:readonly-alert-type/feature/my-feature/getAlertState",
            "alerting:1.0.0-zeta1:readonly-alert-type/feature/my-feature/find",
          ]
        `);
      });
    });

    describe(`globally`, () => {
      test('grants global `read` privileges under feature consumer', () => {
        const actions = new Actions(version);
        const alertingFeaturePrivileges = new FeaturePrivilegeAlertingBuilder(actions);

        const privilege: FeatureKibanaPrivileges = {
          alerting: {
            globally: {
              all: [],
              read: ['alert-type'],
            },
          },

          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        };

        const feature = new Feature({
          id: 'my-feature',
          name: 'my-feature',
          app: [],
          privileges: {
            all: privilege,
            read: privilege,
          },
        });

        expect(alertingFeaturePrivileges.getActions(privilege, feature)).toMatchInlineSnapshot(`
          Array [
            "alerting:1.0.0-zeta1:alert-type/_global/get",
            "alerting:1.0.0-zeta1:alert-type/_global/getAlertState",
            "alerting:1.0.0-zeta1:alert-type/_global/find",
          ]
        `);
      });

      test('grants global `all` privileges under feature consumer', () => {
        const actions = new Actions(version);
        const alertingFeaturePrivileges = new FeaturePrivilegeAlertingBuilder(actions);

        const privilege: FeatureKibanaPrivileges = {
          alerting: {
            globally: {
              all: ['alert-type'],
              read: [],
            },
          },

          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        };

        const feature = new Feature({
          id: 'my-feature',
          name: 'my-feature',
          app: [],
          privileges: {
            all: privilege,
            read: privilege,
          },
        });

        expect(alertingFeaturePrivileges.getActions(privilege, feature)).toMatchInlineSnapshot(`
          Array [
            "alerting:1.0.0-zeta1:alert-type/_global/get",
            "alerting:1.0.0-zeta1:alert-type/_global/getAlertState",
            "alerting:1.0.0-zeta1:alert-type/_global/find",
            "alerting:1.0.0-zeta1:alert-type/_global/create",
            "alerting:1.0.0-zeta1:alert-type/_global/delete",
            "alerting:1.0.0-zeta1:alert-type/_global/update",
            "alerting:1.0.0-zeta1:alert-type/_global/updateApiKey",
            "alerting:1.0.0-zeta1:alert-type/_global/enable",
            "alerting:1.0.0-zeta1:alert-type/_global/disable",
            "alerting:1.0.0-zeta1:alert-type/_global/muteAll",
            "alerting:1.0.0-zeta1:alert-type/_global/unmuteAll",
            "alerting:1.0.0-zeta1:alert-type/_global/muteInstance",
            "alerting:1.0.0-zeta1:alert-type/_global/unmuteInstance",
          ]
        `);
      });

      test('grants both global `all` and global `read` privileges under feature consumer', () => {
        const actions = new Actions(version);
        const alertingFeaturePrivileges = new FeaturePrivilegeAlertingBuilder(actions);

        const privilege: FeatureKibanaPrivileges = {
          alerting: {
            globally: {
              all: ['alert-type'],
              read: ['readonly-alert-type'],
            },
          },

          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        };

        const feature = new Feature({
          id: 'my-feature',
          name: 'my-feature',
          app: [],
          privileges: {
            all: privilege,
            read: privilege,
          },
        });

        expect(alertingFeaturePrivileges.getActions(privilege, feature)).toMatchInlineSnapshot(`
          Array [
            "alerting:1.0.0-zeta1:alert-type/_global/get",
            "alerting:1.0.0-zeta1:alert-type/_global/getAlertState",
            "alerting:1.0.0-zeta1:alert-type/_global/find",
            "alerting:1.0.0-zeta1:alert-type/_global/create",
            "alerting:1.0.0-zeta1:alert-type/_global/delete",
            "alerting:1.0.0-zeta1:alert-type/_global/update",
            "alerting:1.0.0-zeta1:alert-type/_global/updateApiKey",
            "alerting:1.0.0-zeta1:alert-type/_global/enable",
            "alerting:1.0.0-zeta1:alert-type/_global/disable",
            "alerting:1.0.0-zeta1:alert-type/_global/muteAll",
            "alerting:1.0.0-zeta1:alert-type/_global/unmuteAll",
            "alerting:1.0.0-zeta1:alert-type/_global/muteInstance",
            "alerting:1.0.0-zeta1:alert-type/_global/unmuteInstance",
            "alerting:1.0.0-zeta1:readonly-alert-type/_global/get",
            "alerting:1.0.0-zeta1:readonly-alert-type/_global/getAlertState",
            "alerting:1.0.0-zeta1:readonly-alert-type/_global/find",
          ]
        `);
      });
    });
  });
});
