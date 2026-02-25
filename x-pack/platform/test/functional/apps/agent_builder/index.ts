/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export default function ({ loadTestFile }: { loadTestFile: (path: string) => void }) {
  describe('Agent Builder', function () {
    this.tags(['skipCloud']);
    
    loadTestFile(require.resolve('./skills_list'));
    loadTestFile(require.resolve('./skills_crud'));
    loadTestFile(require.resolve('./skills_on_agent_form'));
  });
}