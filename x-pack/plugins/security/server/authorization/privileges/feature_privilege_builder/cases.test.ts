/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureKibanaPrivileges } from '@kbn/features-plugin/server';
import { KibanaFeature } from '@kbn/features-plugin/server';

import { Actions } from '../../actions';
import { FeaturePrivilegeCasesBuilder } from './cases';

const version = '1.0.0-zeta1';

describe(`cases`, () => {
  describe(`feature_privilege_builder`, () => {
    it('grants no privileges by default', () => {
      const actions = new Actions(version);
      const casesFeaturePrivileges = new FeaturePrivilegeCasesBuilder(actions);

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

      expect(casesFeaturePrivileges.getActions(privilege, feature)).toEqual([]);
    });

    describe(`within feature`, () => {
      it('grants `read` privileges under feature', () => {
        const actions = new Actions(version);
        const casesFeaturePrivilege = new FeaturePrivilegeCasesBuilder(actions);

        const privilege: FeatureKibanaPrivileges = {
          cases: {
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

        expect(casesFeaturePrivilege.getActions(privilege, feature)).toMatchInlineSnapshot(`
          Array [
            "cases:1.0.0-zeta1:observability/getCase",
            "cases:1.0.0-zeta1:observability/getComment",
            "cases:1.0.0-zeta1:observability/getTags",
            "cases:1.0.0-zeta1:observability/getReporters",
            "cases:1.0.0-zeta1:observability/getUserActions",
            "cases:1.0.0-zeta1:observability/findConfigurations",
          ]
        `);
      });

      it('grants `all` privileges under feature', () => {
        const actions = new Actions(version);
        const casesFeaturePrivilege = new FeaturePrivilegeCasesBuilder(actions);

        const privilege: FeatureKibanaPrivileges = {
          cases: {
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

        expect(casesFeaturePrivilege.getActions(privilege, feature)).toMatchInlineSnapshot(`
          Array [
            "cases:1.0.0-zeta1:security/getCase",
            "cases:1.0.0-zeta1:security/getComment",
            "cases:1.0.0-zeta1:security/getTags",
            "cases:1.0.0-zeta1:security/getReporters",
            "cases:1.0.0-zeta1:security/getUserActions",
            "cases:1.0.0-zeta1:security/findConfigurations",
            "cases:1.0.0-zeta1:security/createCase",
            "cases:1.0.0-zeta1:security/deleteCase",
            "cases:1.0.0-zeta1:security/updateCase",
            "cases:1.0.0-zeta1:security/pushCase",
            "cases:1.0.0-zeta1:security/createComment",
            "cases:1.0.0-zeta1:security/deleteComment",
            "cases:1.0.0-zeta1:security/updateComment",
            "cases:1.0.0-zeta1:security/createConfiguration",
            "cases:1.0.0-zeta1:security/updateConfiguration",
          ]
        `);
      });

      it('grants both `all` and `read` privileges under feature', () => {
        const actions = new Actions(version);
        const casesFeaturePrivilege = new FeaturePrivilegeCasesBuilder(actions);

        const privilege: FeatureKibanaPrivileges = {
          cases: {
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

        expect(casesFeaturePrivilege.getActions(privilege, feature)).toMatchInlineSnapshot(`
          Array [
            "cases:1.0.0-zeta1:security/getCase",
            "cases:1.0.0-zeta1:security/getComment",
            "cases:1.0.0-zeta1:security/getTags",
            "cases:1.0.0-zeta1:security/getReporters",
            "cases:1.0.0-zeta1:security/getUserActions",
            "cases:1.0.0-zeta1:security/findConfigurations",
            "cases:1.0.0-zeta1:security/createCase",
            "cases:1.0.0-zeta1:security/deleteCase",
            "cases:1.0.0-zeta1:security/updateCase",
            "cases:1.0.0-zeta1:security/pushCase",
            "cases:1.0.0-zeta1:security/createComment",
            "cases:1.0.0-zeta1:security/deleteComment",
            "cases:1.0.0-zeta1:security/updateComment",
            "cases:1.0.0-zeta1:security/createConfiguration",
            "cases:1.0.0-zeta1:security/updateConfiguration",
            "cases:1.0.0-zeta1:obs/getCase",
            "cases:1.0.0-zeta1:obs/getComment",
            "cases:1.0.0-zeta1:obs/getTags",
            "cases:1.0.0-zeta1:obs/getReporters",
            "cases:1.0.0-zeta1:obs/getUserActions",
            "cases:1.0.0-zeta1:obs/findConfigurations",
          ]
        `);
      });

      it('grants both `all` and `read` privileges under feature with multiple values in cases array', () => {
        const actions = new Actions(version);
        const casesFeaturePrivilege = new FeaturePrivilegeCasesBuilder(actions);

        const privilege: FeatureKibanaPrivileges = {
          cases: {
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

        expect(casesFeaturePrivilege.getActions(privilege, feature)).toMatchInlineSnapshot(`
          Array [
            "cases:1.0.0-zeta1:security/getCase",
            "cases:1.0.0-zeta1:security/getComment",
            "cases:1.0.0-zeta1:security/getTags",
            "cases:1.0.0-zeta1:security/getReporters",
            "cases:1.0.0-zeta1:security/getUserActions",
            "cases:1.0.0-zeta1:security/findConfigurations",
            "cases:1.0.0-zeta1:security/createCase",
            "cases:1.0.0-zeta1:security/deleteCase",
            "cases:1.0.0-zeta1:security/updateCase",
            "cases:1.0.0-zeta1:security/pushCase",
            "cases:1.0.0-zeta1:security/createComment",
            "cases:1.0.0-zeta1:security/deleteComment",
            "cases:1.0.0-zeta1:security/updateComment",
            "cases:1.0.0-zeta1:security/createConfiguration",
            "cases:1.0.0-zeta1:security/updateConfiguration",
            "cases:1.0.0-zeta1:other-security/getCase",
            "cases:1.0.0-zeta1:other-security/getComment",
            "cases:1.0.0-zeta1:other-security/getTags",
            "cases:1.0.0-zeta1:other-security/getReporters",
            "cases:1.0.0-zeta1:other-security/getUserActions",
            "cases:1.0.0-zeta1:other-security/findConfigurations",
            "cases:1.0.0-zeta1:other-security/createCase",
            "cases:1.0.0-zeta1:other-security/deleteCase",
            "cases:1.0.0-zeta1:other-security/updateCase",
            "cases:1.0.0-zeta1:other-security/pushCase",
            "cases:1.0.0-zeta1:other-security/createComment",
            "cases:1.0.0-zeta1:other-security/deleteComment",
            "cases:1.0.0-zeta1:other-security/updateComment",
            "cases:1.0.0-zeta1:other-security/createConfiguration",
            "cases:1.0.0-zeta1:other-security/updateConfiguration",
            "cases:1.0.0-zeta1:obs/getCase",
            "cases:1.0.0-zeta1:obs/getComment",
            "cases:1.0.0-zeta1:obs/getTags",
            "cases:1.0.0-zeta1:obs/getReporters",
            "cases:1.0.0-zeta1:obs/getUserActions",
            "cases:1.0.0-zeta1:obs/findConfigurations",
            "cases:1.0.0-zeta1:other-obs/getCase",
            "cases:1.0.0-zeta1:other-obs/getComment",
            "cases:1.0.0-zeta1:other-obs/getTags",
            "cases:1.0.0-zeta1:other-obs/getReporters",
            "cases:1.0.0-zeta1:other-obs/getUserActions",
            "cases:1.0.0-zeta1:other-obs/findConfigurations",
          ]
        `);
      });
    });
  });
});
