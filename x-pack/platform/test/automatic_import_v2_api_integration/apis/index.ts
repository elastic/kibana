/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AutomaticImportV2ApiFtrProviderContext } from '../services/api';

export default function ({ loadTestFile, getService }: AutomaticImportV2ApiFtrProviderContext) {
  describe('Automatic Import V2 Endpoints', function () {
    loadTestFile(require.resolve('./integrations'));
  });
}
