/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureKibanaPrivileges } from '../../../../../features/server';
import { KibanaFeature } from '../../../../../features/server';
import { Actions } from '../../actions';
import { FeaturePrivilegeAlertsBuilder } from './alerts';

const version = '1.0.0-zeta1';

describe(`alerts`, () => {
  describe(`feature_privilege_builder`, () => {
    it('grants no privileges by default', () => {
      const actions = new Actions(version);
      const alertsFeaturePrivileges = new FeaturePrivilegealertsBuilder(actions);

      const privilege: FeatureKibanaPrivileges = {
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

      expect(alertsFeaturePrivileges.getActions(privilege, feature)).toEqual([]);
    });

    describe(`within feature`, () => {
      it('grants `read` privileges under feature', () => {
        const actions = new Actions(version);
        const alertsFeaturePrivilege = new FeaturePrivilegealertsBuilder(actions);

        const privilege: FeatureKibanaPrivileges = {
          alerts: {
            read: ['observability'],
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

        expect(alertsFeaturePrivilege.getActions(privilege, feature)).toMatchInlineSnapshot(`
          Array [
            "alerts:1.0.0-zeta1:observability/get",
            "alerts:1.0.0-zeta1:observability/find",
          ]
        `);
      });

      it('grants `all` privileges under feature', () => {
        const actions = new Actions(version);
        const alertsFeaturePrivilege = new FeaturePrivilegealertsBuilder(actions);

        const privilege: FeatureKibanaPrivileges = {
          alerts: {
            all: ['security'],
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

        expect(alertsFeaturePrivilege.getActions(privilege, feature)).toMatchInlineSnapshot(`
          Array [
            "alerts:1.0.0-zeta1:security/get",
            "alerts:1.0.0-zeta1:security/find",
            "alerts:1.0.0-zeta1:security/create",
            "alerts:1.0.0-zeta1:security/delete",
            "alerts:1.0.0-zeta1:security/update",
          ]
        `);
      });

      it('grants both `all` and `read` privileges under feature', () => {
        const actions = new Actions(version);
        const alertsFeaturePrivilege = new FeaturePrivilegealertsBuilder(actions);

        const privilege: FeatureKibanaPrivileges = {
          alerts: {
            all: ['security'],
            read: ['obs'],
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

        expect(alertsFeaturePrivilege.getActions(privilege, feature)).toMatchInlineSnapshot(`
          Array [
            "alerts:1.0.0-zeta1:security/get",
            "alerts:1.0.0-zeta1:security/find",
            "alerts:1.0.0-zeta1:security/create",
            "alerts:1.0.0-zeta1:security/delete",
            "alerts:1.0.0-zeta1:security/update",
            "alerts:1.0.0-zeta1:obs/get",
            "alerts:1.0.0-zeta1:obs/find",
          ]
        `);
      });

      it('grants both `all` and `read` privileges under feature with multiple values in alerts array', () => {
        const actions = new Actions(version);
        const alertsFeaturePrivilege = new FeaturePrivilegealertsBuilder(actions);

        const privilege: FeatureKibanaPrivileges = {
          alerts: {
            all: ['security', 'other-security'],
            read: ['obs', 'other-obs'],
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

        expect(alertsFeaturePrivilege.getActions(privilege, feature)).toMatchInlineSnapshot(`
          Array [
            "alerts:1.0.0-zeta1:security/get",
            "alerts:1.0.0-zeta1:security/find",
            "alerts:1.0.0-zeta1:security/create",
            "alerts:1.0.0-zeta1:security/delete",
            "alerts:1.0.0-zeta1:security/update",
            "alerts:1.0.0-zeta1:other-security/get",
            "alerts:1.0.0-zeta1:other-security/find",
            "alerts:1.0.0-zeta1:other-security/create",
            "alerts:1.0.0-zeta1:other-security/delete",
            "alerts:1.0.0-zeta1:other-security/update",
            "alerts:1.0.0-zeta1:obs/get",
            "alerts:1.0.0-zeta1:obs/find",
            "alerts:1.0.0-zeta1:other-obs/get",
            "alerts:1.0.0-zeta1:other-obs/find",
          ]
        `);
      });
    });
  });
});
