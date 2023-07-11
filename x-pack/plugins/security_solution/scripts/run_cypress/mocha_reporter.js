/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// COPIED FROM https://github.com/buildkite/test-collector-javascript/pull/47

const { v4: uuidv4 } = require('uuid');
const CI = require('buildkite-test-collector/util/ci');
const Paths = require('buildkite-test-collector/util/paths');
const Mocha = require('mocha');
const Runnable = require('mocha/lib/runnable');
const uploadTestResults = require('buildkite-test-collector/util/uploadTestResults');
const failureExpanded = require('buildkite-test-collector/util/failureExpanded');

// Cypress uses mocha under the hood for assertions, so there is some overlap
// between this reporter and the mocha reporter. They differ in how they
// report errors.

const { EVENT_RUN_END, EVENT_TEST_BEGIN, EVENT_TEST_END } = Mocha.Runner.constants;

const { STATE_PASSED, STATE_PENDING, STATE_FAILED } = Runnable.constants;

class CypressBuildkiteAnalyticsReporter {
  constructor(runner, options) {
    this._options = { token: process.env[`${options.reporterOptions.tokenName}`] };
    this._testResults = [];
    this._testEnv = new CI().env();
    this._paths = new Paths({ cwd: process.cwd() }, this._testEnv.location_prefix);

    runner
      .on(EVENT_TEST_BEGIN, (test) => {
        this.testStarted(test);
      })
      .on(EVENT_TEST_END, (test) => {
        this.testFinished(test);
      })
      .on(EVENT_RUN_END, () => {
        this.testRunFinished();
      });
  }

  testStarted(test) {
    test.testAnalyticsId = uuidv4();
    test.startAt = performance.now() / 1000;
  }

  testFinished(test) {
    const prefixedTestPath = this._paths.prefixTestPath(this.getRootParentFile(test));

    const { failureReason, failureExpanded } = this.getFailureReason(test.err);

    const result = {
      id: test.testAnalyticsId,
      name: test.title,
      scope: this.scope(test),
      identifier: test.fullTitle(),
      file_name: prefixedTestPath,
      location: prefixedTestPath,
      result: this.analyticsResult(test.state),
      failure_reason: failureReason,
      failure_expanded: failureExpanded,
      history: {
        section: 'top',
        start_at: test.startAt,
        end_at: performance.now() / 1000,
        duration: test.duration / 1000,
      },
    };

    this._testResults.push(result);
  }

  getFailureReason(err) {
    if (err === undefined) {
      return {
        failureReason: undefined,
        failureExpanded: [],
      };
    }

    return {
      failureReason: err.message,
      failureExpanded: failureExpanded([err]),
    };
  }

  testRunFinished() {
    uploadTestResults(this._testEnv, this._testResults, this._options);
  }

  analyticsResult(state) {
    // Mocha test statuses:
    // - passed
    // - failed
    // - pending
    //
    // Buildkite Test Analytics execution results:
    // - passed
    // - failed
    // - pending
    // - skipped
    // - unknown
    return {
      [STATE_PASSED]: 'passed',
      [STATE_PENDING]: 'pending',
      [STATE_FAILED]: 'failed',
    }[state];
  }

  scope(test) {
    const titlePath = test.titlePath();
    // titlePath returns an array of the scope + the test title.
    // as the test title is the last array item, we just remove it
    // and then join the rest of the array as a space separated string
    return titlePath.slice(0, titlePath.length - 1).join(' ');
  }

  // Recursively find the root parent, and return the parents file
  // This is required as test.file can be undefined in some tests on cypress
  getRootParentFile(test) {
    if (test.file) {
      return test.file;
    }
    if (test.parent) {
      return this.getRootParentFile(test.parent);
    }
    return null;
  }
}

module.exports = CypressBuildkiteAnalyticsReporter;
