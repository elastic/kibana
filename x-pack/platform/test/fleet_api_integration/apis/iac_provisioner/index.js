/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export default function loadTests({ loadTestFile }) {
  describe('IaC Provisioner', () => {
    loadTestFile(require.resolve('./verify_iac_key'));
    loadTestFile(require.resolve('./render_template'));
    loadTestFile(require.resolve('./privileges'));
  });
}
