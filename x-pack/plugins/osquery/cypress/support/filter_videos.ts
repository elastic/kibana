/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import fs from 'fs';

// makes sure we save videos just for failed specs
export const getFailedSpecVideos = (spec: Cypress.Spec, results: CypressCommandLine.RunResult) => {
  if (results && results.video) {
    // Do we have failures for any retry attempts?
    const failures = results.tests.some((test) =>
      test.attempts.some((attempt) => attempt.state === 'failed')
    );
    if (!failures) {
      // delete the video if the spec passed and no tests retried
      fs.unlinkSync(results.video);
    }
  }
};
