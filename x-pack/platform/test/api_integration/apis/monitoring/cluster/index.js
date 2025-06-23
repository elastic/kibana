/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export default function ({ loadTestFile }) {
  describe('cluster', () => {
    loadTestFile(require.resolve('./list'));
    loadTestFile(require.resolve('./list_mb'));
    loadTestFile(require.resolve('./overview'));
    loadTestFile(require.resolve('./overview_mb'));
  });
}
