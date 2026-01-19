/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export default function ({ loadTestFile }) {
  describe('index lifecycle management', () => {
    loadTestFile(require.resolve('./policies'));
    loadTestFile(require.resolve('./templates'));
    loadTestFile(require.resolve('./indices'));
    loadTestFile(require.resolve('./nodes'));
    loadTestFile(require.resolve('./snapshot_policies'));
    loadTestFile(require.resolve('./snapshot_repositories'));
  });
}
