/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaPrivilege } from './kibana_privilege';
import { PrivilegeCollection } from './privilege_collection';

describe('PrivilegeCollection', () => {
  describe('#grantsPrivilege', () => {
    it('returns true when the collection contains the same privilege being tested', () => {
      const privilege = new KibanaPrivilege('some-privilege', ['action:foo', 'action:bar']);
      const collection = new PrivilegeCollection([privilege]);

      expect(collection.grantsPrivilege(privilege)).toEqual(true);
    });

    it('returns false when a non-empty collection tests an empty privilege', () => {
      const privilege = new KibanaPrivilege('some-privilege', ['action:foo', 'action:bar']);
      const collection = new PrivilegeCollection([privilege]);

      expect(collection.grantsPrivilege(new KibanaPrivilege('test', []))).toEqual(false);
    });

    it('returns true for collections comprised of multiple privileges, with actions spanning them', () => {
      const collection = new PrivilegeCollection([
        new KibanaPrivilege('privilege1', ['action:foo', 'action:bar']),
        new KibanaPrivilege('privilege1', ['action:baz']),
      ]);

      expect(
        collection.grantsPrivilege(
          new KibanaPrivilege('test', ['action:foo', 'action:bar', 'action:baz'])
        )
      ).toEqual(true);
    });

    it('returns false for collections which do not contain all necessary actions', () => {
      const collection = new PrivilegeCollection([
        new KibanaPrivilege('privilege1', ['action:foo', 'action:bar']),
        new KibanaPrivilege('privilege1', ['action:baz']),
      ]);

      expect(
        collection.grantsPrivilege(
          new KibanaPrivilege('test', ['action:foo', 'action:bar', 'action:baz', 'actions:secret'])
        )
      ).toEqual(false);
    });

    it('returns false for collections which contain no privileges', () => {
      const collection = new PrivilegeCollection([]);

      expect(collection.grantsPrivilege(new KibanaPrivilege('test', ['action:foo']))).toEqual(
        false
      );
    });

    it('returns false for collections which contain no privileges, even if the requested privilege has no actions', () => {
      const collection = new PrivilegeCollection([]);

      expect(collection.grantsPrivilege(new KibanaPrivilege('test', []))).toEqual(false);
    });
  });
});
