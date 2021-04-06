/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureKibanaPrivileges } from '../../../../../features/server';
import { Actions } from '../../actions';
import { FeaturePrivilegeRacBuilder } from './rac';

const version = '1.0.0-zeta1';

describe(`rac`, () => {
  describe(`feature_privilege_builder`, () => {
    it('grants no privileges by default', () => {
      const actions = new Actions(version);
      const racFeaturePrivileges = new FeaturePrivilegeRacBuilder(actions);

      const privilege: FeatureKibanaPrivileges = {
        savedObject: {
          all: [],
          read: [],
        },
        ui: [],
      };

      expect(racFeaturePrivileges.getActions(privilege)).toEqual([]);
    });

    describe(`within feature`, () => {
      it('grants `read` privileges under feature', () => {
        const actions = new Actions(version);
        const alertsFeaturePrivilege = new FeaturePrivilegeRacBuilder(actions);

        const privilege: FeatureKibanaPrivileges = {
          rac: {
            read: ['observability'],
          },
          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        };

        expect(alertsFeaturePrivilege.getActions(privilege)).toMatchInlineSnapshot(`
          Array [
            "rac:1.0.0-zeta1:observability/get",
            "rac:1.0.0-zeta1:observability/find",
          ]
        `);
      });

      it('grants `all` privileges under feature', () => {
        const actions = new Actions(version);
        const alertsFeaturePrivilege = new FeaturePrivilegeRacBuilder(actions);

        const privilege: FeatureKibanaPrivileges = {
          rac: {
            all: ['security'],
          },

          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        };

        expect(alertsFeaturePrivilege.getActions(privilege)).toMatchInlineSnapshot(`
          Array [
            "rac:1.0.0-zeta1:security/get",
            "rac:1.0.0-zeta1:security/find",
            "rac:1.0.0-zeta1:security/update",
          ]
        `);
      });

      it('grants both `all` and `read` privileges under feature', () => {
        const actions = new Actions(version);
        const alertsFeaturePrivilege = new FeaturePrivilegeRacBuilder(actions);

        const privilege: FeatureKibanaPrivileges = {
          rac: {
            all: ['security'],
            read: ['obs'],
          },

          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        };

        expect(alertsFeaturePrivilege.getActions(privilege)).toMatchInlineSnapshot(`
          Array [
            "rac:1.0.0-zeta1:security/get",
            "rac:1.0.0-zeta1:security/find",
            "rac:1.0.0-zeta1:security/update",
            "rac:1.0.0-zeta1:obs/get",
            "rac:1.0.0-zeta1:obs/find",
          ]
        `);
      });

      it('grants both `all` and `read` privileges under feature with multiple values in rac array', () => {
        const actions = new Actions(version);
        const alertsFeaturePrivilege = new FeaturePrivilegeRacBuilder(actions);

        const privilege: FeatureKibanaPrivileges = {
          rac: {
            all: ['security', 'other-security'],
            read: ['obs', 'other-obs'],
          },

          savedObject: {
            all: [],
            read: [],
          },
          ui: [],
        };

        expect(alertsFeaturePrivilege.getActions(privilege)).toMatchInlineSnapshot(`
          Array [
            "rac:1.0.0-zeta1:security/get",
            "rac:1.0.0-zeta1:security/find",
            "rac:1.0.0-zeta1:security/update",
            "rac:1.0.0-zeta1:other-security/get",
            "rac:1.0.0-zeta1:other-security/find",
            "rac:1.0.0-zeta1:other-security/update",
            "rac:1.0.0-zeta1:obs/get",
            "rac:1.0.0-zeta1:obs/find",
            "rac:1.0.0-zeta1:other-obs/get",
            "rac:1.0.0-zeta1:other-obs/find",
          ]
        `);
      });
    });
  });
});
