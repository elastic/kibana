/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export default function loadTests({ loadTestFile }) {
  describe('Settings Endpoints', () => {
<<<<<<< HEAD
    loadTestFile(require.resolve('./get'));
    loadTestFile(require.resolve('./update'));
=======
    loadTestFile(require.resolve('./global_settings'));
>>>>>>> f0912d36b34 ([Fleet] Remove agent policies revision bump after updating settings (#239977))
    loadTestFile(require.resolve('./enrollment'));
    loadTestFile(require.resolve('./enrollment_privileges'));
  });
}
