/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaPrivilege } from './kibana_privilege';
import { KibanaPrivileges } from './kibana_privileges';
import type { RoleKibanaPrivilege } from '../../../../common';
import { kibanaFeatures } from '../__fixtures__/kibana_features';
import { createRawKibanaPrivileges } from '../__fixtures__/kibana_privileges';

describe('KibanaPrivileges', () => {
  describe('#getBasePrivileges', () => {
    it('returns the space base privileges for a non-global entry', () => {
      const rawPrivileges = createRawKibanaPrivileges(kibanaFeatures);
      const kibanaPrivileges = new KibanaPrivileges(rawPrivileges, kibanaFeatures);

      const entry: RoleKibanaPrivilege = {
        base: [],
        feature: {},
        spaces: ['foo'],
      };

      const basePrivileges = kibanaPrivileges.getBasePrivileges(entry);

      const expectedPrivileges = rawPrivileges.space;

      expect(basePrivileges).toHaveLength(2);
      expect(basePrivileges[0]).toMatchObject({
        id: 'all',
        actions: expectedPrivileges.all,
      });
      expect(basePrivileges[1]).toMatchObject({
        id: 'read',
        actions: expectedPrivileges.read,
      });
    });

    it('returns the global base privileges for a global entry', () => {
      const rawPrivileges = createRawKibanaPrivileges(kibanaFeatures);
      const kibanaPrivileges = new KibanaPrivileges(rawPrivileges, kibanaFeatures);

      const entry: RoleKibanaPrivilege = {
        base: [],
        feature: {},
        spaces: ['*'],
      };

      const basePrivileges = kibanaPrivileges.getBasePrivileges(entry);

      const expectedPrivileges = rawPrivileges.global;

      expect(basePrivileges).toHaveLength(2);
      expect(basePrivileges[0]).toMatchObject({
        id: 'all',
        actions: expectedPrivileges.all,
      });
      expect(basePrivileges[1]).toMatchObject({
        id: 'read',
        actions: expectedPrivileges.read,
      });
    });
  });

  describe('#createCollectionFromRoleKibanaPrivileges', () => {
    it('creates a collection from a role with no privileges assigned', () => {
      const rawPrivileges = createRawKibanaPrivileges(kibanaFeatures);
      const kibanaPrivileges = new KibanaPrivileges(rawPrivileges, kibanaFeatures);

      const assignedPrivileges: RoleKibanaPrivilege[] = [];
      kibanaPrivileges.createCollectionFromRoleKibanaPrivileges(assignedPrivileges);
    });

    it('creates a collection ignoring unknown privileges', () => {
      const rawPrivileges = createRawKibanaPrivileges(kibanaFeatures);
      const kibanaPrivileges = new KibanaPrivileges(rawPrivileges, kibanaFeatures);

      const assignedPrivileges: RoleKibanaPrivilege[] = [
        {
          base: ['read', 'some-unknown-base-privilege'],
          feature: {},
          spaces: ['*'],
        },
        {
          base: [],
          feature: {
            with_sub_features: ['read', 'cool_all', 'some-unknown-feature-privilege'],
            some_unknown_feature: ['all'],
          },
          spaces: ['foo'],
        },
      ];
      kibanaPrivileges.createCollectionFromRoleKibanaPrivileges(assignedPrivileges);
    });

    it('creates a collection using all assigned privileges, and only the assigned privileges', () => {
      const rawPrivileges = createRawKibanaPrivileges(kibanaFeatures);
      const kibanaPrivileges = new KibanaPrivileges(rawPrivileges, kibanaFeatures);

      const assignedPrivileges: RoleKibanaPrivilege[] = [
        {
          base: ['read'],
          feature: {},
          spaces: ['*'],
        },
        {
          base: [],
          feature: {
            with_sub_features: ['read', 'cool_all'],
          },
          spaces: ['foo'],
        },
      ];
      const collection =
        kibanaPrivileges.createCollectionFromRoleKibanaPrivileges(assignedPrivileges);

      expect(
        collection.grantsPrivilege(
          new KibanaPrivilege('test', [...rawPrivileges.features.with_excluded_sub_features.read])
        )
      ).toEqual(true);

      expect(
        collection.grantsPrivilege(
          new KibanaPrivilege('test', [...rawPrivileges.features.with_excluded_sub_features.all])
        )
      ).toEqual(false);

      expect(
        collection.grantsPrivilege(
          new KibanaPrivilege('test', [...rawPrivileges.features.with_sub_features.cool_all])
        )
      ).toEqual(true);

      expect(
        collection.grantsPrivilege(
          new KibanaPrivilege('test', [...rawPrivileges.features.with_sub_features.cool_toggle_1])
        )
      ).toEqual(false);
    });
  });
});
