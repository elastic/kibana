/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AutomaticImportApiFtrProviderContext } from '../services/api';

export default function ({ loadTestFile, getService }: AutomaticImportApiFtrProviderContext) {
  describe('Automatic Import Endpoints', function () {
    loadTestFile(require.resolve('./integrations'));
  });
}
