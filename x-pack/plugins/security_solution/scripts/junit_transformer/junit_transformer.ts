import { createFlagError } from '@kbn/dev-cli-errors';
import { run } from '@kbn/dev-cli-runner';
import { Builder, parseStringPromise } from 'xml2js';
import { promises as fs } from 'fs';
import { relative } from 'path';
import * as t from 'io-ts';
import { isLeft } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import globby from 'globby';


/**
 * This script processes all junit reports matching a glob pattern. It reads each report, parses it into json, validates that it is a report from Cypress, then transforms the report to a form that can be processed by Kibana Operations workflows and the failed-test-reporter, it then optionally writes the report back, in xml format, to the original file path.
 */
run(
  async ({ flags, log }) => {
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
      const maybeValidationResult: { result: CypressJunitReport } | { error : string } = validatedCypressJunitReport(unvalidatedReportJson);

      if ('error' in maybeValidationResult) {
        // If there is an error, continue trying to process other files.
        log.error(`Error while validating ${path}: ${maybeValidationResult.error}`);
      } else {
        const reportJson: CypressJunitReport = maybeValidationResult.result;
        const reportString: string = await transformedReport({
          reportJson,
          reportName: flags.reportName,
          rootDirectory: flags.rootDirectory
        });

        // If the writeInPlace flag was passed, overwrite the original file, otherwise log the output to stdout
        if (flags.writeInPlace) {
          await fs.writeFile(path, reportString);
        } else {
          log.write(reportString);
        }
      }
    }
    log.success('task complete');
  },
  {
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
      `
    },
  }
);

/**
 * Updates the `name` and `classname` attributes of each testcase.
 * `name` will have the value of `classname` appended to it. This makes sense because they each contain part of the bdd spec.
 * `classname` is replaced with the file path, relative to the kibana project directory, and encoded (by replacing periods with a non-ascii character.) This is the format expected by the failed test reporter and the Kibana Operations flaky test triage workflows.
 */
async function transformedReport({ reportJson, rootDirectory, reportName }: { reportJson: CypressJunitReport, rootDirectory: string, reportName: string }): Promise<string> {

  // The first testsuite is the 'root' test suite and contains the file path to the spec
  const rootSuite = reportJson.testsuites.testsuite[0];

  const specFile = rootSuite.$.file;

  for (const testsuite of reportJson.testsuites.testsuite.slice(1)) {
    if (CypressJunitTestSuite.is(testsuite)) {
      for (const testcase of testsuite.testcase) {

        // append the `classname` attribute to the `name` attribute
        testcase.$.name = `${testcase.$.name} ${testcase.$.classname}`;

        // calculate the path of the spec file relative to the kibana project directory
        const projectRelativePath = relative(rootDirectory, specFile);

        // encode the path by relacing dots with a non-ascii character
        const encodedPath = projectRelativePath.replace(/\./g, '·');

        // prepend the encoded path with a report name. This is for display purposes and shows up in the github issue. It is required. Store the value in the `classname` attribute.
        testcase.$.classname = `${reportName}.${encodedPath}`;
      }
    }
  }

  var builder = new Builder();
  // Return the report in an xml string
  return builder.buildObject(reportJson);
}

/**
 * Test cases have a name, which is populated with part of the BDD test name, and classname, which is also populated with part of the BDD test name.
 */
const CypressJunitTestCase = t.type({
  $: t.type({
    name: t.string,
    classname: t.string
  })
});

/**
 * Standard testsuites contain testcase elements, each representing a specific test execution.
 */
const CypressJunitTestSuite = t.type({
  testcase: t.array(CypressJunitTestCase)
});

/**
 * The root suite is a special test suite, found at the same level as other test suites, but which contains no test cases and has the file name as an attribute.
 */
const CypressJunitRootTestSuite = t.type({
  $: t.type({
    name: t.literal("Root Suite"),
    file: t.string
  })
})

/** This type represents the Cypress-specific flavor of junit report. It is 'Loose', because it does not enforce the following rule:
 * The first test suite must be the 'root' test suite, which has no test cases and has a 'file' attribute. All subsequent testsuite's must have testcases.
 *
 * See `CypressJunitReport` for a stricter type, which is returned from `validatedCypressJunitReport`
 */
const LooseCypressJunitReport = t.type({
  testsuites: t.type({
    /** The testsuite's created by the Cypress junit reporter are non-standard. The first testsuite has a name: 'Root Suite' and contains the path of the spec file, relative to where Cypress was invoked, in the 'file' attribute. Other testsuites are standard and relate to a 'describe' block. They contain 'testcase' elements.
     *
     * For this reason, the testsuite array is a union of two types, the CypressJunitRootTestSuite, which is the first element, and which is non-standard, and the CypressJunitTestSuite, which is the type representing the remaining, standard, testsuite elements.
     */
    testsuite: t.array(t.union([CypressJunitRootTestSuite, CypressJunitTestSuite]))
  })
})

/**
 * Type representing a Cypress Junit report. Created by validatedCypressJunitReport. This is more specific than LooseCypressJunitReport.
 */
type CypressJunitReport = {
  testsuites: {
    testsuite: [t.TypeOf<typeof CypressJunitRootTestSuite>, ...t.TypeOf<typeof CypressJunitTestSuite>[]]
  }
}

/**
 * Validate the JSON representation of the Junit XML.
 * If there are no errors, this returns `{ result: 'successs' }`, otherwise it returns an error, wrapped in `{ error: string }`.
 *
 * This uses io-ts to do a base level of validation, and then does additional assertions. io-ts has, at the time of this writing, poor support for specifiying an array type where the first element has a different type than all subsequent elements. Therefore we do that validation using the custom predicate functions (i.e. `.is`.)
 *
 * This also asserts that the junit report contains no '·' characters in the classname. This character is used by the kibana operations triage scripts, and the failed test reporter, to replace `.` characters in a path as part of its encoding scheme. If this character is found, we assume that the encoding has already taken place.
 */
function validatedCypressJunitReport(parsedReport: unknown): { result: CypressJunitReport } | { error: string } {
  const decoded = LooseCypressJunitReport.decode(parsedReport);

  // Error text to append to each error message.
  const boilerplate: string = 'This script relies on this assumption. If your junit report is valid, then you must enhance this script in order to have support for it. If you are not trying to transform a Cypress junit report into a report that is compatible with Kibana Operations workflows, then you are running this script in error.';

  if (isLeft(decoded)) {
    return { error: `Could not validate data: ${PathReporter.report(decoded).join("\n")}. This script uses an io-ts schema to validate that parsed Junit reports match the expected schema. This script is only designed to process Junit reports generated by Cypress. ${boilerplate}` }
  }

  // Used to store validation error messages from `predicate`.
  const errorBox: { value: null | string } = { value: null };

  // This predicate will narrow the type from LooseCypressJunitReport to CypressJunitReport
  if (isCypressJunitReport(decoded.right, errorBox)) {
    return { result: decoded.right };
  } else {
    if (errorBox.value === null) {
      throw new Error('The predicate returned false without assigning predicate error.');
    }
    return { error: errorBox.value };
  }

  /*
   * Narrows `report` to a CypressJunitReport, which is a type that has CypressJunitRootTestSuite as the first test suite and CypressJunitTestSuite as all subsequent test suites.
   *
   * This typescript predicate needs to log error messages to the console, but predicates can only return boolean types.
   * Therefore this populates the `errorBox` parameter with an error message when returning false.
   */
  function isCypressJunitReport(report: t.TypeOf<typeof LooseCypressJunitReport>, errorBox: { value: null | string }): report is CypressJunitReport {
    for (let index = 0; index < report.testsuites.testsuite.length; index++) {
      const testsuite = report.testsuites.testsuite[index];

      if (index === 0) {
        if (!CypressJunitRootTestSuite.is(testsuite)) {
          errorBox.value = `The first suite must be the Root Suite, which contains the spec file name. ${boilerplate}`;
          return false
        }
      } else {
        if (!CypressJunitTestSuite.is(testsuite)) {
          errorBox.value = `All testsuite elements except for the first one must have testcase elements. ${boilerplate}`;
          return false
        } else {
          for (const testcase of testsuite.testcase) {
            if (testcase.$.classname.indexOf('·') !== -1) {
              errorBox.value = `This report appears to have already been transformed because a '·' character was found in the classname. If your test intentionally includes this character as part of its name, remove it. This character is reserved for encoding file paths in the classname attribute. ${boilerplate}`;
              return false;
            }
          }
        }
      }
    }
    return true
  }
}
