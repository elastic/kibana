/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-continue */

import { createFlagError } from '@kbn/dev-cli-errors';
import type { RunContext } from '@kbn/dev-cli-runner';
import { Builder, parseStringPromise } from 'xml2js';
import { promises as fs } from 'fs';
import { relative } from 'path';
import * as t from 'io-ts';
import { isLeft } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import globby from 'globby';
import del from 'del';

/**
 * Updates the `name` and `classname` attributes of each testcase.
 * `name` will have the value of `classname` appended to it. This makes sense because they each contain part of the bdd spec.
 * `classname` is replaced with the file path, relative to the kibana project directory, and encoded (by replacing periods with a non-ascii character.) This is the format expected by the failed test reporter and the Kibana Operations flaky test triage workflows.
 */
async function transformedReport({
  reportJson,
  specFilePath,
  rootDirectory,
  reportName,
}: {
  reportJson: CypressJunitReport;
  specFilePath: string;
  rootDirectory: string;
  reportName: string;
}): Promise<string> {
  for (const testsuite of reportJson.testsuites.testsuite) {
    if (!testsuite.testcase) {
      // If there are no testcases for this testsuite, skip it
      continue;
    }
    for (const testcase of testsuite.testcase) {
      // append the `classname` attribute to the `name` attribute
      testcase.$.name = `${testcase.$.name} ${testcase.$.classname}`;

      // calculate the path of the spec file relative to the kibana project directory
      const projectRelativePath = relative(rootDirectory, specFilePath);

      // encode the path by relacing dots with a non-ascii character
      const encodedPath = projectRelativePath.replace(/\./g, '·');

      // prepend the encoded path with a report name. This is for display purposes and shows up in the github issue. It is required. Store the value in the `classname` attribute.
      testcase.$.classname = `${reportName}.${encodedPath}`;
    }
  }

  const builder = new Builder();
  // Return the report in an xml string
  return builder.buildObject(reportJson);
}

/**
 * Test cases have a name, which is populated with part of the BDD test name, and classname, which is also populated with part of the BDD test name.
 */
const CypressJunitTestCase = t.type({
  $: t.type({
    name: t.string,
    classname: t.string,
  }),
});

/**
 * Standard testsuites contain testcase elements, each representing a specific test execution.
 */
const CypressJunitTestSuite = t.intersection([
  t.partial({
    testcase: t.array(CypressJunitTestCase),
  }),
  t.type({
    $: t.intersection([
      t.type({
        name: t.string,
      }),
      /* `file` is only found on some suites, namely the 'Root Suite' */
      t.partial({
        file: t.string,
      }),
    ]),
  }),
]);

const CypressJunitReport = t.type({
  testsuites: t.type({
    testsuite: t.array(CypressJunitTestSuite),
  }),
});

/**
 * This type represents the Cypress-specific flavor of junit report.
 **/
type CypressJunitReport = t.TypeOf<typeof CypressJunitReport>;

/**
 * Encapsulate either a successful result, or a recoverable error. This module only throws unrecoverable errors.
 */
type Result<T> = { result: T } | { error: string };

/*
 * This checks if the junit report contains '·' characters in the classname. This character is used by the kibana operations triage scripts, and the failed test reporter, to replace `.` characters in a path as part of its encoding scheme. If this character is found, we assume that the encoding has already taken place.
 */
function isReportAlreadyProcessed(
  report: CypressJunitReport
): { processed: boolean; hadTestCases: true } | { processed: undefined; hadTestCases: false } {
  for (const testsuite of report.testsuites.testsuite) {
    if (!testsuite.testcase) {
      // If there are no testcases for this testsuite, skip it
      continue;
    }
    for (const testcase of testsuite.testcase) {
      if (testcase.$.classname.indexOf('·') !== -1) {
        return { processed: true, hadTestCases: true };
      } else {
        return { processed: false, hadTestCases: true };
      }
    }
  }
  return { processed: undefined, hadTestCases: false };
}

/**
 * Validate the JSON representation of the Junit XML.
 * If there are no errors, this returns `{ result: 'successs' }`, otherwise it returns an error, wrapped in `{ error: string }`.
 *
 */
function validatedCypressJunitReport(parsedReport: unknown): Result<CypressJunitReport> {
  const decoded = CypressJunitReport.decode(parsedReport);

  if (isLeft(decoded)) {
    return {
      error: `Could not validate data: ${PathReporter.report(decoded).join('\n')}.
`,
    };
  }
  return { result: decoded.right };
}

/**
 * Iterate over the test suites and find the root suite, which Cypress populates with the path to the spec file. Return the path.
 */
function findSpecFilePathFromRootSuite(reportJson: CypressJunitReport): Result<string> {
  for (const testsuite of reportJson.testsuites.testsuite) {
    if (testsuite.$.name === 'Root Suite' && testsuite.$.file) {
      return { result: testsuite.$.file };
    }
  }
  return {
    error: "No Root Suite containing a 'file' attribute was found.",
  };
}

/**
 * The CLI command, exported for the sake of automated tests.
 */
export async function command({ flags, log }: CommandArgs) {
  if (typeof flags.pathPattern !== 'string' || flags.pathPattern.length === 0) {
    throw createFlagError('please provide a single --pathPattern flag');
  }

  if (typeof flags.rootDirectory !== 'string' || flags.rootDirectory.length === 0) {
    throw createFlagError('please provide a single --rootDirectory flag');
  }

  if (typeof flags.reportName !== 'string' || flags.reportName.length === 0) {
    throw createFlagError('please provide a single --reportName flag');
  }

  for (const path of await globby(flags.pathPattern)) {
    // Read the file
    const source: string = await fs.readFile(path, 'utf8');

    // Parse it from XML to json
    const unvalidatedReportJson: unknown = await parseStringPromise(source);

    // Apply validation and return the validated report, or an error message
    const maybeValidationResult: Result<CypressJunitReport> =
      validatedCypressJunitReport(unvalidatedReportJson);

    const boilerplate = `This script validates each Junit report to ensure that it was produced by Cypress and that it has not already been processed by this script
This script relies on various assumptions. If your junit report is valid, then you must enhance this script in order to have support for it. If you are not trying to transform a Cypress junit report into a report that is compatible with Kibana Operations workflows, then you are running this script in error.`;

    const logError = (error: string) => {
      log.error(`Error while validating ${path}: ${error}
${boilerplate}
`);
    };

    if ('error' in maybeValidationResult) {
      logError(maybeValidationResult.error);
      // Sending broken XML to Failed Test Reporter will cause a job to fail
      await del(path);
      log.warning(`${path} file was deleted.`);
      // If there is an error, continue trying to process other files.
      continue;
    }

    const reportJson: CypressJunitReport = maybeValidationResult.result;

    const { processed, hadTestCases } = isReportAlreadyProcessed(reportJson);
    if (hadTestCases === false) {
      log.warning(`${path} had no test cases.
${boilerplate}
`);
      await del(path);
      log.warning(`${path} file was deleted.`);
      // If there is an error, continue trying to process other files.
      continue;
    }

    if (processed) {
      logError(
        "This report appears to have already been transformed because a '·' character was found in the classname. If your test intentionally includes this character as part of its name, remove it. This character is reserved for encoding file paths in the classname attribute."
      );
      // If there is an error, continue trying to process other files.
      continue;
    }

    const maybeSpecFilePath: Result<string> = findSpecFilePathFromRootSuite(reportJson);

    if ('error' in maybeSpecFilePath) {
      logError(maybeSpecFilePath.error);
      // Sending broken XML to Failed Test Reporter will cause a job to fail
      await del(path);
      log.warning(`${path} file was deleted.`);
      // If there is an error, continue trying to process other files.
      continue;
    }

    const reportString: string = await transformedReport({
      reportJson,
      specFilePath: maybeSpecFilePath.result,
      reportName: flags.reportName,
      rootDirectory: flags.rootDirectory,
    });

    // If the writeInPlace flag was passed, overwrite the original file, otherwise log the output to stdout
    if (flags.writeInPlace) {
      log.info(`Wrote transformed junit report to ${path}`);
      await fs.writeFile(path, reportString);
    } else {
      log.write(reportString);
    }
  }
  log.success('task complete');
}

/**
 * The args passed to our command. These are a subset of RunContext. By using a subset, we make mocking easier.
 */
export interface CommandArgs {
  flags: { [index: string]: string | boolean | string[] | undefined };
  /** just pick the parts of `log` that we use. This makes mocking much easier. */
  log: Pick<RunContext['log'], 'info' | 'write' | 'error' | 'success' | 'warning'>;
}
