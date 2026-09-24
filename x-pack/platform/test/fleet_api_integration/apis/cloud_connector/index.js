/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export default function loadTests({ loadTestFile }) {
  describe('Cloud Connectors', () => {
    loadTestFile(require.resolve('./cloud_connector'));
    loadTestFile(require.resolve('./edit_role_arn'));
    loadTestFile(require.resolve('./privileges'));
    // Enables space awareness, which cannot be turned off again, so it runs last.
    loadTestFile(require.resolve('./edit_role_arn_shared_spaces'));
  });
}
