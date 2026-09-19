/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from 'expect';

import type { Role } from '@kbn/security-plugin-types-common';

import type { FtrProviderContext } from '../../ftr_provider_context';

/**
 * Exercises `case_5_feature` (registered in the `features_provider` test plugin), which extracts
 * access to Saved Object types `two` and `three` out of its `all`/`read` privileges' own baseline
 * via `privilegeVersions`, one extraction at a time — WITHOUT deprecating the feature or changing
 * its id. See elastic/kibana#291144.
 */
export default function ({ getService }: FtrProviderContext) {
  describe('versioned minimal privileges (live feature, no deprecation)', function () {
    const security = getService('security');

    afterEach(async () => {
      await Promise.all([
        security.role.delete('case_5_oldest').catch(() => {}),
        security.role.delete('case_5_middle').catch(() => {}),
        security.role.delete('case_5_current').catch(() => {}),
        security.role.delete('case_5_all').catch(() => {}),
      ]);
    });

    it('a role holding the original, unversioned minimal id keeps BOTH extracted grants', async () => {
      // This is a role as it could have been stored before `case_5_feature` ever extracted
      // anything — no role save has happened, and none is required.
      await security.role.create('case_5_oldest', {
        elasticsearch: { cluster: [], indices: [], run_as: [] },
        kibana: [{ spaces: ['*'], base: [], feature: { case_5_feature: ['minimal_all'] } }],
      });

      const { kibana } = (await security.role.get('case_5_oldest', {
        replaceDeprecatedPrivileges: true,
      })) as Role;

      // Normalizes to the CURRENT minimal id plus both sub-feature privileges that were
      // extracted after it — this is the "Role UI still shows one feature" criterion: a single
      // `case_5_feature` entry, not three generations of privilege names.
      expect(kibana).toEqual([
        {
          spaces: ['*'],
          base: [],
          feature: { case_5_feature: ['minimal_all_v3', 'so_two_all', 'so_three_all'] },
        },
      ]);
    });

    it('a role customized between the two extractions keeps the second grant, loses only the first', async () => {
      // Saved after the FIRST extraction (so it already lost saved-object type `two`'s grant via
      // its own save) but before the SECOND — it holds `minimal_all_v2`. Adding the second
      // extraction later must not silently re-grant `two`, and must not drop `three` either.
      await security.role.create('case_5_middle', {
        elasticsearch: { cluster: [], indices: [], run_as: [] },
        kibana: [{ spaces: ['*'], base: [], feature: { case_5_feature: ['minimal_all_v2'] } }],
      });

      const { kibana } = (await security.role.get('case_5_middle', {
        replaceDeprecatedPrivileges: true,
      })) as Role;

      expect(kibana).toEqual([
        {
          spaces: ['*'],
          base: [],
          feature: { case_5_feature: ['minimal_all_v3', 'so_three_all'] },
        },
      ]);
    });

    it('a role already on the current minimal id round-trips unchanged', async () => {
      await security.role.create('case_5_current', {
        elasticsearch: { cluster: [], indices: [], run_as: [] },
        kibana: [{ spaces: ['*'], base: [], feature: { case_5_feature: ['minimal_all_v3'] } }],
      });

      const { kibana } = (await security.role.get('case_5_current', {
        replaceDeprecatedPrivileges: true,
      })) as Role;

      expect(kibana).toEqual([
        { spaces: ['*'], base: [], feature: { case_5_feature: ['minimal_all_v3'] } },
      ]);
    });

    it('a role holding the full `all` privilege is completely unaffected', async () => {
      // `all` was never a minimal id, and stays whole automatically regardless of how many times
      // the feature's `minimal_all` has been versioned.
      await security.role.create('case_5_all', {
        elasticsearch: { cluster: [], indices: [], run_as: [] },
        kibana: [{ spaces: ['*'], base: [], feature: { case_5_feature: ['all'] } }],
      });

      const { kibana } = (await security.role.get('case_5_all', {
        replaceDeprecatedPrivileges: true,
      })) as Role;

      expect(kibana).toEqual([{ spaces: ['*'], base: [], feature: { case_5_feature: ['all'] } }]);
    });
  });
}
