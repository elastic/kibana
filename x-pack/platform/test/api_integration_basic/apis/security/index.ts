/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ loadTestFile }: FtrProviderContext) {
  describe('security (basic license)', function () {
    this.tags('skipFIPS');
    // Updates here should be mirrored from `../../../api_integration/apis/security/index.ts` if tests
    // should also run under a basic license.

    loadTestFile(require.resolve('../../../api_integration/apis/security/api_keys'));
    loadTestFile(require.resolve('../../../api_integration/apis/security/basic_login'));
    loadTestFile(require.resolve('../../../api_integration/apis/security/builtin_es_privileges'));
    loadTestFile(require.resolve('../../../api_integration/apis/security/change_password'));
    loadTestFile(require.resolve('../../../api_integration/apis/security/index_fields'));
    loadTestFile(require.resolve('../../../api_integration/apis/security/query_api_keys'));
    loadTestFile(require.resolve('../../../api_integration/apis/security/roles'));
    loadTestFile(require.resolve('../../../api_integration/apis/security/users'));
    loadTestFile(require.resolve('./privileges'));
    loadTestFile(require.resolve('../../../api_integration/apis/security/roles_bulk'));
  });
}
