/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run } from '@kbn/dev-cli-runner';
import { command } from './lib';

/**
 * This script processes all junit reports matching a glob pattern. It reads each report, parses it into json, validates that it is a report from Cypress, then transforms the report to a form that can be processed by Kibana Operations workflows and the failed-test-reporter, it then optionally writes the report back, in xml format, to the original file path.
 */
run(command, {
  description: `
      Transform junit reports to match the style required by the Kibana Operations flaky test triage workflows such as '/skip'.
    `,
  flags: {
    string: ['pathPattern', 'rootDirectory', 'reportName'],
    boolean: ['writeInPlace'],
    help: `
        --pathPattern      Required, glob passed to globby to select files to operate on
        --rootDirectory    Required, path of the kibana repo. Used to calcuate the file path of each spec file relative to the Kibana repo
        --reportName       Required, used as a prefix for the classname. Eventually shows up in the title of flaky test Github issues
        --writeInPlace     Defaults to false. If passed, rewrite the file in place with transformations. If false, the script will pass the transformed XML as a string to stdout

      If an error is encountered when processing one file, the script will still attempt to process other files.
      `,
  },
});
