/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureKibanaPrivileges } from '../../../../../features/server';
import { KibanaFeature } from '../../../../../features/server';
import { Actions } from '../../actions';
import { FeaturePrivilegeAlertingBuilder } from './alerting';

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
            "alerting:1.0.0-zeta1:alert-type/my-feature/rule/get",
            "alerting:1.0.0-zeta1:alert-type/my-feature/rule/getRuleState",
            "alerting:1.0.0-zeta1:alert-type/my-feature/rule/getAlertSummary",
            "alerting:1.0.0-zeta1:alert-type/my-feature/rule/find",
            "alerting:1.0.0-zeta1:alert-type/my-feature/alert/get",
            "alerting:1.0.0-zeta1:alert-type/my-feature/alert/find",
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
            "alerting:1.0.0-zeta1:alert-type/my-feature/rule/get",
            "alerting:1.0.0-zeta1:alert-type/my-feature/rule/getRuleState",
            "alerting:1.0.0-zeta1:alert-type/my-feature/rule/getAlertSummary",
            "alerting:1.0.0-zeta1:alert-type/my-feature/rule/find",
            "alerting:1.0.0-zeta1:alert-type/my-feature/rule/create",
            "alerting:1.0.0-zeta1:alert-type/my-feature/rule/delete",
            "alerting:1.0.0-zeta1:alert-type/my-feature/rule/update",
            "alerting:1.0.0-zeta1:alert-type/my-feature/rule/updateApiKey",
            "alerting:1.0.0-zeta1:alert-type/my-feature/rule/enable",
            "alerting:1.0.0-zeta1:alert-type/my-feature/rule/disable",
            "alerting:1.0.0-zeta1:alert-type/my-feature/rule/muteAll",
            "alerting:1.0.0-zeta1:alert-type/my-feature/rule/unmuteAll",
            "alerting:1.0.0-zeta1:alert-type/my-feature/rule/muteAlert",
            "alerting:1.0.0-zeta1:alert-type/my-feature/rule/unmuteAlert",
            "alerting:1.0.0-zeta1:alert-type/my-feature/alert/get",
            "alerting:1.0.0-zeta1:alert-type/my-feature/alert/find",
            "alerting:1.0.0-zeta1:alert-type/my-feature/alert/update",
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
            "alerting:1.0.0-zeta1:alert-type/my-feature/rule/get",
            "alerting:1.0.0-zeta1:alert-type/my-feature/rule/getRuleState",
            "alerting:1.0.0-zeta1:alert-type/my-feature/rule/getAlertSummary",
            "alerting:1.0.0-zeta1:alert-type/my-feature/rule/find",
            "alerting:1.0.0-zeta1:alert-type/my-feature/rule/create",
            "alerting:1.0.0-zeta1:alert-type/my-feature/rule/delete",
            "alerting:1.0.0-zeta1:alert-type/my-feature/rule/update",
            "alerting:1.0.0-zeta1:alert-type/my-feature/rule/updateApiKey",
            "alerting:1.0.0-zeta1:alert-type/my-feature/rule/enable",
            "alerting:1.0.0-zeta1:alert-type/my-feature/rule/disable",
            "alerting:1.0.0-zeta1:alert-type/my-feature/rule/muteAll",
            "alerting:1.0.0-zeta1:alert-type/my-feature/rule/unmuteAll",
            "alerting:1.0.0-zeta1:alert-type/my-feature/rule/muteAlert",
            "alerting:1.0.0-zeta1:alert-type/my-feature/rule/unmuteAlert",
            "alerting:1.0.0-zeta1:alert-type/my-feature/alert/get",
            "alerting:1.0.0-zeta1:alert-type/my-feature/alert/find",
            "alerting:1.0.0-zeta1:alert-type/my-feature/alert/update",
            "alerting:1.0.0-zeta1:readonly-alert-type/my-feature/rule/get",
            "alerting:1.0.0-zeta1:readonly-alert-type/my-feature/rule/getRuleState",
            "alerting:1.0.0-zeta1:readonly-alert-type/my-feature/rule/getAlertSummary",
            "alerting:1.0.0-zeta1:readonly-alert-type/my-feature/rule/find",
            "alerting:1.0.0-zeta1:readonly-alert-type/my-feature/alert/get",
            "alerting:1.0.0-zeta1:readonly-alert-type/my-feature/alert/find",
          ]
        `);
      });
    });
  });
});
