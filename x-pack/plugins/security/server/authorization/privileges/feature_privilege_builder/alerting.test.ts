/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureKibanaPrivileges } from '@kbn/features-plugin/server';
import { KibanaFeature } from '@kbn/features-plugin/server';

import { FeaturePrivilegeAlertingBuilder } from './alerting';
import { Actions } from '../../actions';

describe(`feature_privilege_builder`, () => {
  describe(`alerting`, () => {
    test('grants no privileges by default', () => {
      const actions = new Actions();
      const alertingFeaturePrivileges = new FeaturePrivilegeAlertingBuilder(actions);

      const privilege: FeatureKibanaPrivileges = {
        alerting: {
          rule: {
            all: [],
            read: [],
          },
          alert: {
            all: [],
            read: [],
          },
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
      test('grants `read` privileges to rules under feature consumer', () => {
        const actions = new Actions();
        const alertingFeaturePrivileges = new FeaturePrivilegeAlertingBuilder(actions);

        const privilege: FeatureKibanaPrivileges = {
          alerting: {
            rule: {
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
            "alerting:alert-type/my-feature/rule/get",
            "alerting:alert-type/my-feature/rule/getRuleState",
            "alerting:alert-type/my-feature/rule/getAlertSummary",
            "alerting:alert-type/my-feature/rule/getExecutionLog",
            "alerting:alert-type/my-feature/rule/getActionErrorLog",
            "alerting:alert-type/my-feature/rule/find",
            "alerting:alert-type/my-feature/rule/getRuleExecutionKPI",
            "alerting:alert-type/my-feature/rule/runSoon",
          ]
        `);
      });

      test('grants `read` privileges to alerts under feature consumer', () => {
        const actions = new Actions();
        const alertingFeaturePrivileges = new FeaturePrivilegeAlertingBuilder(actions);

        const privilege: FeatureKibanaPrivileges = {
          alerting: {
            alert: {
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
            "alerting:alert-type/my-feature/alert/get",
            "alerting:alert-type/my-feature/alert/find",
            "alerting:alert-type/my-feature/alert/getAuthorizedAlertsIndices",
            "alerting:alert-type/my-feature/alert/getAlertSummary",
          ]
        `);
      });

      test('grants `read` privileges to rules and alerts under feature consumer', () => {
        const actions = new Actions();
        const alertingFeaturePrivileges = new FeaturePrivilegeAlertingBuilder(actions);

        const privilege: FeatureKibanaPrivileges = {
          alerting: {
            rule: {
              all: [],
              read: ['alert-type'],
            },
            alert: {
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
            "alerting:alert-type/my-feature/rule/get",
            "alerting:alert-type/my-feature/rule/getRuleState",
            "alerting:alert-type/my-feature/rule/getAlertSummary",
            "alerting:alert-type/my-feature/rule/getExecutionLog",
            "alerting:alert-type/my-feature/rule/getActionErrorLog",
            "alerting:alert-type/my-feature/rule/find",
            "alerting:alert-type/my-feature/rule/getRuleExecutionKPI",
            "alerting:alert-type/my-feature/rule/runSoon",
            "alerting:alert-type/my-feature/alert/get",
            "alerting:alert-type/my-feature/alert/find",
            "alerting:alert-type/my-feature/alert/getAuthorizedAlertsIndices",
            "alerting:alert-type/my-feature/alert/getAlertSummary",
          ]
        `);
      });

      test('grants `all` privileges to rules under feature consumer', () => {
        const actions = new Actions();
        const alertingFeaturePrivileges = new FeaturePrivilegeAlertingBuilder(actions);

        const privilege: FeatureKibanaPrivileges = {
          alerting: {
            rule: {
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
            "alerting:alert-type/my-feature/rule/get",
            "alerting:alert-type/my-feature/rule/getRuleState",
            "alerting:alert-type/my-feature/rule/getAlertSummary",
            "alerting:alert-type/my-feature/rule/getExecutionLog",
            "alerting:alert-type/my-feature/rule/getActionErrorLog",
            "alerting:alert-type/my-feature/rule/find",
            "alerting:alert-type/my-feature/rule/getRuleExecutionKPI",
            "alerting:alert-type/my-feature/rule/runSoon",
            "alerting:alert-type/my-feature/rule/create",
            "alerting:alert-type/my-feature/rule/delete",
            "alerting:alert-type/my-feature/rule/update",
            "alerting:alert-type/my-feature/rule/updateApiKey",
            "alerting:alert-type/my-feature/rule/enable",
            "alerting:alert-type/my-feature/rule/disable",
            "alerting:alert-type/my-feature/rule/muteAll",
            "alerting:alert-type/my-feature/rule/unmuteAll",
            "alerting:alert-type/my-feature/rule/muteAlert",
            "alerting:alert-type/my-feature/rule/unmuteAlert",
            "alerting:alert-type/my-feature/rule/snooze",
            "alerting:alert-type/my-feature/rule/bulkEdit",
            "alerting:alert-type/my-feature/rule/bulkDelete",
            "alerting:alert-type/my-feature/rule/bulkEnable",
            "alerting:alert-type/my-feature/rule/bulkDisable",
            "alerting:alert-type/my-feature/rule/unsnooze",
          ]
        `);
      });

      test('grants `all` privileges to alerts under feature consumer', () => {
        const actions = new Actions();
        const alertingFeaturePrivileges = new FeaturePrivilegeAlertingBuilder(actions);

        const privilege: FeatureKibanaPrivileges = {
          alerting: {
            alert: {
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
            "alerting:alert-type/my-feature/alert/get",
            "alerting:alert-type/my-feature/alert/find",
            "alerting:alert-type/my-feature/alert/getAuthorizedAlertsIndices",
            "alerting:alert-type/my-feature/alert/getAlertSummary",
            "alerting:alert-type/my-feature/alert/update",
          ]
        `);
      });

      test('grants `all` privileges to rules and alerts under feature consumer', () => {
        const actions = new Actions();
        const alertingFeaturePrivileges = new FeaturePrivilegeAlertingBuilder(actions);

        const privilege: FeatureKibanaPrivileges = {
          alerting: {
            rule: {
              all: ['alert-type'],
              read: [],
            },
            alert: {
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
            "alerting:alert-type/my-feature/rule/get",
            "alerting:alert-type/my-feature/rule/getRuleState",
            "alerting:alert-type/my-feature/rule/getAlertSummary",
            "alerting:alert-type/my-feature/rule/getExecutionLog",
            "alerting:alert-type/my-feature/rule/getActionErrorLog",
            "alerting:alert-type/my-feature/rule/find",
            "alerting:alert-type/my-feature/rule/getRuleExecutionKPI",
            "alerting:alert-type/my-feature/rule/runSoon",
            "alerting:alert-type/my-feature/rule/create",
            "alerting:alert-type/my-feature/rule/delete",
            "alerting:alert-type/my-feature/rule/update",
            "alerting:alert-type/my-feature/rule/updateApiKey",
            "alerting:alert-type/my-feature/rule/enable",
            "alerting:alert-type/my-feature/rule/disable",
            "alerting:alert-type/my-feature/rule/muteAll",
            "alerting:alert-type/my-feature/rule/unmuteAll",
            "alerting:alert-type/my-feature/rule/muteAlert",
            "alerting:alert-type/my-feature/rule/unmuteAlert",
            "alerting:alert-type/my-feature/rule/snooze",
            "alerting:alert-type/my-feature/rule/bulkEdit",
            "alerting:alert-type/my-feature/rule/bulkDelete",
            "alerting:alert-type/my-feature/rule/bulkEnable",
            "alerting:alert-type/my-feature/rule/bulkDisable",
            "alerting:alert-type/my-feature/rule/unsnooze",
            "alerting:alert-type/my-feature/alert/get",
            "alerting:alert-type/my-feature/alert/find",
            "alerting:alert-type/my-feature/alert/getAuthorizedAlertsIndices",
            "alerting:alert-type/my-feature/alert/getAlertSummary",
            "alerting:alert-type/my-feature/alert/update",
          ]
        `);
      });

      test('grants both `all` and `read` to rules privileges under feature consumer', () => {
        const actions = new Actions();
        const alertingFeaturePrivileges = new FeaturePrivilegeAlertingBuilder(actions);

        const privilege: FeatureKibanaPrivileges = {
          alerting: {
            rule: {
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
            "alerting:alert-type/my-feature/rule/get",
            "alerting:alert-type/my-feature/rule/getRuleState",
            "alerting:alert-type/my-feature/rule/getAlertSummary",
            "alerting:alert-type/my-feature/rule/getExecutionLog",
            "alerting:alert-type/my-feature/rule/getActionErrorLog",
            "alerting:alert-type/my-feature/rule/find",
            "alerting:alert-type/my-feature/rule/getRuleExecutionKPI",
            "alerting:alert-type/my-feature/rule/runSoon",
            "alerting:alert-type/my-feature/rule/create",
            "alerting:alert-type/my-feature/rule/delete",
            "alerting:alert-type/my-feature/rule/update",
            "alerting:alert-type/my-feature/rule/updateApiKey",
            "alerting:alert-type/my-feature/rule/enable",
            "alerting:alert-type/my-feature/rule/disable",
            "alerting:alert-type/my-feature/rule/muteAll",
            "alerting:alert-type/my-feature/rule/unmuteAll",
            "alerting:alert-type/my-feature/rule/muteAlert",
            "alerting:alert-type/my-feature/rule/unmuteAlert",
            "alerting:alert-type/my-feature/rule/snooze",
            "alerting:alert-type/my-feature/rule/bulkEdit",
            "alerting:alert-type/my-feature/rule/bulkDelete",
            "alerting:alert-type/my-feature/rule/bulkEnable",
            "alerting:alert-type/my-feature/rule/bulkDisable",
            "alerting:alert-type/my-feature/rule/unsnooze",
            "alerting:readonly-alert-type/my-feature/rule/get",
            "alerting:readonly-alert-type/my-feature/rule/getRuleState",
            "alerting:readonly-alert-type/my-feature/rule/getAlertSummary",
            "alerting:readonly-alert-type/my-feature/rule/getExecutionLog",
            "alerting:readonly-alert-type/my-feature/rule/getActionErrorLog",
            "alerting:readonly-alert-type/my-feature/rule/find",
            "alerting:readonly-alert-type/my-feature/rule/getRuleExecutionKPI",
            "alerting:readonly-alert-type/my-feature/rule/runSoon",
          ]
        `);
      });

      test('grants both `all` and `read` to alerts privileges under feature consumer', () => {
        const actions = new Actions();
        const alertingFeaturePrivileges = new FeaturePrivilegeAlertingBuilder(actions);

        const privilege: FeatureKibanaPrivileges = {
          alerting: {
            alert: {
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
            "alerting:alert-type/my-feature/alert/get",
            "alerting:alert-type/my-feature/alert/find",
            "alerting:alert-type/my-feature/alert/getAuthorizedAlertsIndices",
            "alerting:alert-type/my-feature/alert/getAlertSummary",
            "alerting:alert-type/my-feature/alert/update",
            "alerting:readonly-alert-type/my-feature/alert/get",
            "alerting:readonly-alert-type/my-feature/alert/find",
            "alerting:readonly-alert-type/my-feature/alert/getAuthorizedAlertsIndices",
            "alerting:readonly-alert-type/my-feature/alert/getAlertSummary",
          ]
        `);
      });

      test('grants both `all` and `read` to rules and alerts privileges under feature consumer', () => {
        const actions = new Actions();
        const alertingFeaturePrivileges = new FeaturePrivilegeAlertingBuilder(actions);

        const privilege: FeatureKibanaPrivileges = {
          alerting: {
            rule: {
              all: ['alert-type'],
              read: ['readonly-alert-type'],
            },
            alert: {
              all: ['another-alert-type'],
              read: ['readonly-alert-type'],
            },
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
            "alerting:alert-type/my-feature/rule/get",
            "alerting:alert-type/my-feature/rule/getRuleState",
            "alerting:alert-type/my-feature/rule/getAlertSummary",
            "alerting:alert-type/my-feature/rule/getExecutionLog",
            "alerting:alert-type/my-feature/rule/getActionErrorLog",
            "alerting:alert-type/my-feature/rule/find",
            "alerting:alert-type/my-feature/rule/getRuleExecutionKPI",
            "alerting:alert-type/my-feature/rule/runSoon",
            "alerting:alert-type/my-feature/rule/create",
            "alerting:alert-type/my-feature/rule/delete",
            "alerting:alert-type/my-feature/rule/update",
            "alerting:alert-type/my-feature/rule/updateApiKey",
            "alerting:alert-type/my-feature/rule/enable",
            "alerting:alert-type/my-feature/rule/disable",
            "alerting:alert-type/my-feature/rule/muteAll",
            "alerting:alert-type/my-feature/rule/unmuteAll",
            "alerting:alert-type/my-feature/rule/muteAlert",
            "alerting:alert-type/my-feature/rule/unmuteAlert",
            "alerting:alert-type/my-feature/rule/snooze",
            "alerting:alert-type/my-feature/rule/bulkEdit",
            "alerting:alert-type/my-feature/rule/bulkDelete",
            "alerting:alert-type/my-feature/rule/bulkEnable",
            "alerting:alert-type/my-feature/rule/bulkDisable",
            "alerting:alert-type/my-feature/rule/unsnooze",
            "alerting:readonly-alert-type/my-feature/rule/get",
            "alerting:readonly-alert-type/my-feature/rule/getRuleState",
            "alerting:readonly-alert-type/my-feature/rule/getAlertSummary",
            "alerting:readonly-alert-type/my-feature/rule/getExecutionLog",
            "alerting:readonly-alert-type/my-feature/rule/getActionErrorLog",
            "alerting:readonly-alert-type/my-feature/rule/find",
            "alerting:readonly-alert-type/my-feature/rule/getRuleExecutionKPI",
            "alerting:readonly-alert-type/my-feature/rule/runSoon",
            "alerting:another-alert-type/my-feature/alert/get",
            "alerting:another-alert-type/my-feature/alert/find",
            "alerting:another-alert-type/my-feature/alert/getAuthorizedAlertsIndices",
            "alerting:another-alert-type/my-feature/alert/getAlertSummary",
            "alerting:another-alert-type/my-feature/alert/update",
            "alerting:readonly-alert-type/my-feature/alert/get",
            "alerting:readonly-alert-type/my-feature/alert/find",
            "alerting:readonly-alert-type/my-feature/alert/getAuthorizedAlertsIndices",
            "alerting:readonly-alert-type/my-feature/alert/getAlertSummary",
          ]
        `);
      });
    });
  });
});
