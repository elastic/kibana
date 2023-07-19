import { createFlagError } from '@kbn/dev-cli-errors';
import { run } from '@kbn/dev-cli-runner';
import { Builder, parseStringPromise } from 'xml2js';
import { promises as fs } from 'fs';
import { relative } from 'path';
import * as t from 'io-ts';
import { isLeft } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import globby from 'globby';


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
      const maybeReport = await transformedReport({
        path,
        reportName: flags.reportName,
        rootDirectory: flags.rootDirectory
      });
      if ('result' in maybeReport) {
        const { result: report } = maybeReport;
        log.success('transformed ' + path);
        if (flags.writeInPlace) {
          await fs.writeFile(path, report);
        } else {
          log.write(report);
        }
      } else {
        log.error(maybeReport.error);
      }
    }
    log.success('task complete');
  },
  {
    description: `
      Transform junit reports to match the style required by kibana operations flaky test triage workflows such as '/skip'.
    `,
    flags: {
      string: ['pathPattern', 'rootDirectory', 'reportName'],
      boolean: ['writeInPlace'],
      help: `
        --pathPattern      Required, glob passed to globby to select files to operate on
        --rootDirectory    Required, path of the kibana repo
        --reportName       Required, used as a prefix for the classname. Eventually shows up in the title of flaky test Github issues
        --writeInPlace     Defaults to false. If passed, rewrite the file in place with transformations. If false, the script will pass the transformed XML as a string to stdout
      `
    },
  }
);

async function transformedReport({ path, rootDirectory, reportName }: { path: string, rootDirectory: string, reportName: string }): Promise<{ result: string } | { error: string }> {
  const source = await fs.readFile(path, 'utf8');
  const result = await parseStringPromise(source /*, options */);
  const maybeValidationResult = validateCypressJunitReport(result);
  if ('result' in maybeValidationResult) {
    if (CypressJunitReport.is(result)) {

      const rootSuite = result.testsuites.testsuite[0];

      if (CypressJunitRootTestSuite.is(rootSuite)) {

        const specFile = rootSuite.$.file;

        for (const testsuite of result.testsuites.testsuite.slice(1)) {
          if (CypressJunitTestSuite.is(testsuite)) {
            for (const testcase of testsuite.testcase) {
              testcase.$.name = `${testcase.$.name} ${testcase.$.classname}`;
              const projectRelativePath = relative(rootDirectory, specFile);
              const encodedPath = projectRelativePath.replace(/\./g, '·');
              testcase.$.classname = `${reportName}.${encodedPath}`;
            }
          }
        }

        var builder = new Builder();
        return { result: builder.buildObject(result) };
      } else {
        // this should be unreacheable as we've already validated the object with io-ts
        return { error: 'could not process report even though schema validation passed.' }
      }
    } else {
      // this should be unreacheable as we've already validated the object with io-ts
      return { error: 'could not process report even though schema validation passed.' }
    }
  } else {
    // definitely an error
    return { error: `Error while validating ${path}: ${maybeValidationResult.error}`};
  }
}

/**
 * Test cases have a name, which is populated with part of the BDD test name, and classname, which is also populated with part of the BDD test name.
 *
 */
const CypressJunitTestCase = t.type({
  $: t.type({
    name: t.string,
    classname: t.string
  })
});

/**
 * standard testsuites contain testcase elements, each representing a specific test execution.
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

/** This type represents the Cypress-specific flavor of junit report */
const CypressJunitReport = t.type({
  testsuites: t.type({
    /** The testsuite's created by the Cypress junit reporter are non-standard. The first testsuite has a name: 'Root Suite' and contains the path of the spec file, relative to where Cypress was invoked, in the 'file' attribute. Other testsuites are standard and relate to a 'describe' block. They contain 'testcase' elements.
     *
     * For this reason, the testsuite array is a union of two types, the CypressJunitRootTestSuite, which is the first element, and which is non-standard, and the CypressJunitTestSuite, which is the type representing the remaining, standard, testsuite elements.
     */
    testsuite: t.array(t.union([CypressJunitRootTestSuite, CypressJunitTestSuite]))
  })
})

/**
 * Validate the JSON representation of the Junit XML.
 * If there are no errors, this returns `{ result: 'successs' }`, otherwise it returns an error, wrapped in `{ error: string }`.
 *
 * This uses io-ts to do a base level of validation, and then does additional assertions. io-ts has, at the time of this writing, poor support for specifiying an array type where the first element has a different type than all subsequent elements. Therefore we do that validation using the custom predicate functions (i.e. `.is`.)
 *
 * This also asserts that the junit report contains no '·' characters in the classname. This character is used by the kibana operations triage scripts, and the failed test reporter, to replace `.` characters in a path as part of its encoding scheme. If this character is found, we assume that the encoding has already taken place.
 */
function validateCypressJunitReport(parsedReport: unknown): { result: 'success' } | { error: string} {
  const decoded = CypressJunitReport.decode(parsedReport);

  // Error text to append to each error message.
  const boilerplate: string = 'This script relies on this assumption. If your junit report is valid, then you must enhance this script in order to have support for it. If you are not trying to transform a Cypress junit report into a report that is compatible with Kibana Operations workflows, then you are running this script in error.';

  if (isLeft(decoded)) {
    return { error: `Could not validate data: ${PathReporter.report(decoded).join("\n")}. This script uses an io-ts schema to validate that parsed Junit reports match the expected schema. This script is only designed to process Junit reports generated by Cypress. ${boilerplate}` }
  }

  const valid: t.TypeOf<typeof CypressJunitReport> = decoded.right;

  // TODO: explain why the first element in the array is different and why we care.
  for (let index = 0; index < valid.testsuites.testsuite.length; index++) {
    const testsuite = valid.testsuites.testsuite[index];


    if (index === 0) {
      if (!CypressJunitRootTestSuite.is(testsuite)) {
        return { error: `The first suite must be the Root Suite, which contains the spec file name. ${boilerplate}` };
      }
    } else {
      if (!CypressJunitTestSuite.is(testsuite)) {
        return { error: `All testsuite elements except for the first one must have testcase elements. ${boilerplate}` };
      } else {
        for (const testcase of testsuite.testcase) {
          if (testcase.$.classname.indexOf('·') !== -1) {
            return { error : `This report appears to have already been transformed because a '·' character was found in the classname. If your test intentionally includes this character as part of its name, remove it. This character is reserved for encoding file paths in the classname attribute. ${boilerplate}`};
          }
        }
      }
    }
  }

  return { result: 'success' };
}
