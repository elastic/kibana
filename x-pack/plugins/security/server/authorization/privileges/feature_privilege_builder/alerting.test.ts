/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Actions } from '../../actions';
import { FeaturePrivilegeAlertingBuilder } from './alerting';
import { KibanaFeature, FeatureKibanaPrivileges } from '../../../../../features/server';

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

      const feature = new KibanaFeature({
        id: 'my-feature',
        name: 'my-feature',
        app: [],
        category: { id: 'foo', label: 'foo' },
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

        const feature = new KibanaFeature({
          id: 'my-feature',
          name: 'my-feature',
          app: [],
          category: { id: 'foo', label: 'foo' },
          privileges: {
            all: privilege,
            read: privilege,
          },
        });

        expect(alertingFeaturePrivileges.getActions(privilege, feature)).toMatchInlineSnapshot(`
          Array [
            "alerting:1.0.0-zeta1:alert-type/my-feature/get",
            "alerting:1.0.0-zeta1:alert-type/my-feature/getAlertState",
            "alerting:1.0.0-zeta1:alert-type/my-feature/getAlertInstanceSummary",
            "alerting:1.0.0-zeta1:alert-type/my-feature/find",
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

        const feature = new KibanaFeature({
          id: 'my-feature',
          name: 'my-feature',
          app: [],
          category: { id: 'foo', label: 'foo' },
          privileges: {
            all: privilege,
            read: privilege,
          },
        });

        expect(alertingFeaturePrivileges.getActions(privilege, feature)).toMatchInlineSnapshot(`
          Array [
            "alerting:1.0.0-zeta1:alert-type/my-feature/get",
            "alerting:1.0.0-zeta1:alert-type/my-feature/getAlertState",
            "alerting:1.0.0-zeta1:alert-type/my-feature/getAlertInstanceSummary",
            "alerting:1.0.0-zeta1:alert-type/my-feature/find",
            "alerting:1.0.0-zeta1:alert-type/my-feature/create",
            "alerting:1.0.0-zeta1:alert-type/my-feature/delete",
            "alerting:1.0.0-zeta1:alert-type/my-feature/update",
            "alerting:1.0.0-zeta1:alert-type/my-feature/updateApiKey",
            "alerting:1.0.0-zeta1:alert-type/my-feature/enable",
            "alerting:1.0.0-zeta1:alert-type/my-feature/disable",
            "alerting:1.0.0-zeta1:alert-type/my-feature/muteAll",
            "alerting:1.0.0-zeta1:alert-type/my-feature/unmuteAll",
            "alerting:1.0.0-zeta1:alert-type/my-feature/muteInstance",
            "alerting:1.0.0-zeta1:alert-type/my-feature/unmuteInstance",
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

        const feature = new KibanaFeature({
          id: 'my-feature',
          name: 'my-feature',
          app: [],
          category: { id: 'foo', label: 'foo' },
          privileges: {
            all: privilege,
            read: privilege,
          },
        });

        expect(alertingFeaturePrivileges.getActions(privilege, feature)).toMatchInlineSnapshot(`
          Array [
            "alerting:1.0.0-zeta1:alert-type/my-feature/get",
            "alerting:1.0.0-zeta1:alert-type/my-feature/getAlertState",
            "alerting:1.0.0-zeta1:alert-type/my-feature/getAlertInstanceSummary",
            "alerting:1.0.0-zeta1:alert-type/my-feature/find",
            "alerting:1.0.0-zeta1:alert-type/my-feature/create",
            "alerting:1.0.0-zeta1:alert-type/my-feature/delete",
            "alerting:1.0.0-zeta1:alert-type/my-feature/update",
            "alerting:1.0.0-zeta1:alert-type/my-feature/updateApiKey",
            "alerting:1.0.0-zeta1:alert-type/my-feature/enable",
            "alerting:1.0.0-zeta1:alert-type/my-feature/disable",
            "alerting:1.0.0-zeta1:alert-type/my-feature/muteAll",
            "alerting:1.0.0-zeta1:alert-type/my-feature/unmuteAll",
            "alerting:1.0.0-zeta1:alert-type/my-feature/muteInstance",
            "alerting:1.0.0-zeta1:alert-type/my-feature/unmuteInstance",
            "alerting:1.0.0-zeta1:readonly-alert-type/my-feature/get",
            "alerting:1.0.0-zeta1:readonly-alert-type/my-feature/getAlertState",
            "alerting:1.0.0-zeta1:readonly-alert-type/my-feature/getAlertInstanceSummary",
            "alerting:1.0.0-zeta1:readonly-alert-type/my-feature/find",
          ]
        `);
      });
    });
  });
});
