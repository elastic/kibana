/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable */

// / <reference types="cypress" />
// @ts-check

const dayjs = require('dayjs');
const duration = require('dayjs/plugin/duration');
// const { filterSpecsFromCoverage } = require('./support-utils');

dayjs.extend(duration);


/**
 * Sends collected code coverage object to the backend code
 * via "cy.task".
 */
const sendCoverage = (coverage: any, pathname = '/') => {
  logMessage(`Saving code coverage for **${pathname}**`);

  // const withoutSpecs = filterSpecsFromCoverage(coverage);
  const appCoverageOnly = filterSupportFilesFromCoverage(coverage);

  // stringify coverage object for speed
  cy.task('combineCoverage', JSON.stringify(appCoverageOnly), {
    log: false,
  });
};

/**
 * Consistently logs the given string to the Command Log
 * so the user knows the log message is coming from this plugin.
 * @param {string} s Message to log.
 */
const logMessage = (s: string) => {
  cy.log(`${s} \`[@cypress/code-coverage]\``);
};

/**
 * Removes support file from the coverage object.
 * If there are more files loaded from support folder, also removes them
 */
const filterSupportFilesFromCoverage = (totalCoverage: any) => {
  const integrationFolder = Cypress.config('integrationFolder');
  const supportFile = Cypress.config('supportFile');

  /** @type {string} Cypress run-time config has the support folder string */
  // @ts-ignore
  const supportFolder = Cypress.config('supportFolder');

  const isSupportFile = (filename: string) => filename === supportFile;

  let coverage = Cypress._.omitBy(totalCoverage, (fileCoverage, filename) =>
    isSupportFile(filename)
  );

  // check the edge case
  //   if we have files from support folder AND the support folder is not same
  //   as the integration, or its prefix (this might remove all app source files)
  //   then remove all files from the support folder
  if (!integrationFolder.startsWith(supportFolder)) {
    // remove all covered files from support folder
    coverage = Cypress._.omitBy(totalCoverage, (fileCoverage, filename) =>
      filename.startsWith(supportFolder)
    );
  }
  return coverage;
};

const registerHooks = () => {
  let windowCoverageObjects: any[];

  const hasE2ECoverage = () => Boolean(windowCoverageObjects.length);

  // @ts-ignore
  const hasUnitTestCoverage = () => Boolean(window.__coverage__);

  before(() => {
    // we need to reset the coverage when running
    // in the interactive mode, otherwise the counters will
    // keep increasing every time we rerun the tests
    const logInstance = Cypress.log({
      name: 'Coverage',
      message: ['Reset [@cypress/code-coverage]'],
    });

    cy.task(
      'resetCoverage',
      {
        // @ts-ignore
        isInteractive: Cypress.config('isInteractive'),
      },
      { log: false }
    ).then(() => {
      logInstance.end();
    });
  });

  beforeEach(() => {
    // each object will have the coverage and url pathname
    // to let the user know the coverage has been collected
    windowCoverageObjects = [];

    const saveCoverageObject = (win: any) => {
      console.log('wwwww', win, win.windows?.__coverage__, win.__coverage__);
      // if application code has been instrumented, the app iframe "window" has an object
      const applicationSourceCoverage = win.__coverage__;
      if (!applicationSourceCoverage) {
        return;
      }

      if (
        Cypress._.find(windowCoverageObjects, {
          coverage: applicationSourceCoverage,
        })
      ) {
        // this application code coverage object is already known
        // which can happen when combining `window:load` and `before` callbacks
        return;
      }

      windowCoverageObjects.push({
        coverage: applicationSourceCoverage,
        pathname: win.location.pathname,
      });
    };

    // save reference to coverage for each app window loaded in the test
    cy.on('window:load', saveCoverageObject);

    // save reference if visiting a page inside a before() hook
    cy.window({ log: false }).then(saveCoverageObject);
  });

  afterEach(() => {
    // save coverage after the test
    // because now the window coverage objects have been updated
    windowCoverageObjects.forEach((cover) => {
      sendCoverage(cover.coverage, cover.pathname);
    });

    if (!hasE2ECoverage()) {
      if (hasUnitTestCoverage()) {
        logMessage(`👉 Only found unit test code coverage.`);
      } else {
        const expectBackendCoverageOnly = Cypress._.get(
          Cypress.env('codeCoverage'),
          'expectBackendCoverageOnly',
          false
        );
        if (!expectBackendCoverageOnly) {
          logMessage(`
            ⚠️ Could not find any coverage information in your application
            by looking at the window coverage object.
            Did you forget to instrument your application?
            See [code-coverage#instrument-your-application](https://github.com/cypress-io/code-coverage#instrument-your-application)
          `);
        }
      }
    }
  });

  after(() => {
    // I wish I could fail the tests if there is no code coverage information
    // but throwing an error here does not fail the test run due to
    // https://github.com/cypress-io/cypress/issues/2296

    // there might be server-side code coverage information
    // we should grab it once after all tests finish
    // @ts-ignore
    const baseUrl = Cypress.config('baseUrl') || cy.state('window').origin;
    // @ts-ignore
    const runningEndToEndTests = baseUrl !== Cypress.config('proxyUrl');
    const specType = Cypress._.get(Cypress.spec, 'specType', 'integration');
    const isIntegrationSpec = specType === 'integration';

    if (runningEndToEndTests && isIntegrationSpec) {
      // we can only request server-side code coverage
      // if we are running end-to-end tests,
      // otherwise where do we send the request?
      const url = Cypress._.get(Cypress.env('codeCoverage'), 'url', '/__coverage__');
      cy.request({
        url,
        log: false,
        failOnStatusCode: false,
      })
        .then((r) => Cypress._.get(r, 'body.coverage', null))
        .then((coverage) => {
          if (!coverage) {
            // we did not get code coverage - this is the
            // original failed request
            const expectBackendCoverageOnly = Cypress._.get(
              Cypress.env('codeCoverage'),
              'expectBackendCoverageOnly',
              false
            );
            if (expectBackendCoverageOnly) {
              throw new Error(`Expected to collect backend code coverage from ${url}`);
            } else {
              // we did not really expect to collect the backend code coverage
              return;
            }
          }
          sendCoverage(coverage, 'backend');
        });
    }
  });

  after(() => {
    // collect and merge frontend coverage

    // if spec bundle has been instrumented (using Cypress preprocessor)
    // then we will have unit test coverage
    // NOTE: spec iframe is NOT reset between the tests, so we can grab
    // the coverage information only once after all tests have finished
    // @ts-ignore
    const unitTestCoverage = window.__coverage__;
    if (unitTestCoverage) {
      sendCoverage(unitTestCoverage, 'unit');
    }
  });

  after(() => {
    // when all tests finish, lets generate the coverage report
    const logInstance = Cypress.log({
      name: 'Coverage',
      message: ['Generating report [@cypress/code-coverage]'],
    });
    cy.task('coverageReport', null, {
      timeout: dayjs.duration(3, 'minutes').asMilliseconds(),
      log: false,
    }).then((coverageReportFolder) => {
      logInstance.set('consoleProps', () => ({
        'coverage report folder': coverageReportFolder,
      }));
      logInstance.end();
      return coverageReportFolder;
    });
  });
};

// to disable code coverage commands and save time
// pass environment variable coverage=false
//  cypress run --env coverage=false
// or
//  CYPRESS_coverage=false cypress run
// see https://on.cypress.io/environment-variables

// to avoid "coverage" env variable being case-sensitive, convert to lowercase
const cyEnvs = Cypress._.mapKeys(Cypress.env(), (value, key) => key.toLowerCase());

if (cyEnvs.coverage === false) {
  console.log('Skipping code coverage hooks');
} else if (Cypress.env('codeCoverageTasksRegistered') !== true) {
  // register a hook just to log a message
  before(() => {
    logMessage(`
      ⚠️ Code coverage tasks were not registered by the plugins file.
      See [support issue](https://github.com/cypress-io/code-coverage/issues/179)
      for possible workarounds.
    `);
  });
} else {
  registerHooks();
}
