/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export default function loadTests({ loadTestFile }) {
  describe('Space awareness', () => {
    loadTestFile(require.resolve('./enrollment_api_keys'));
    loadTestFile(require.resolve('./uninstall_tokens'));
    loadTestFile(require.resolve('./agent_policies'));
    loadTestFile(require.resolve('./agent_policies_side_effects'));
    loadTestFile(require.resolve('./agents'));
    loadTestFile(require.resolve('./enrollment_settings'));
    loadTestFile(require.resolve('./package_install'));
    loadTestFile(require.resolve('./space_settings'));
    loadTestFile(require.resolve('./actions'));
    loadTestFile(require.resolve('./change_space_agent_policies'));
    loadTestFile(require.resolve('./space_awareness_migration'));
    loadTestFile(require.resolve('./telemetry'));
    loadTestFile(require.resolve('./outputs'));
  });
}
