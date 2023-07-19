import { createFlagError } from '@kbn/dev-cli-errors';
import { run } from '@kbn/dev-cli-runner';
import { Builder, parseStringPromise } from 'xml2js';
import { promises as fs } from 'fs';
import { relative } from 'path';
import * as t from 'io-ts';
import { isLeft } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import globby from 'globby';

const CypressJunitTestCase = t.type({
  $: t.type({
    name: t.string,
    classname: t.string
  })
});

const CypressJunitTestSuite = t.type({
  testcase: t.array(CypressJunitTestCase)
});

const CypressJunitRootTestSuite = t.type({
  $: t.type({
    name: t.literal("Root Suite"),
    file: t.string
  })
})

const CypressJunitReport = t.type({
  testsuites: t.type({
    testsuite: t.array(t.union([CypressJunitRootTestSuite, CypressJunitTestSuite]))
  })
})

function validateCypressJunitReport(parsedReport: any): { result: 'success' } | { error: string} {
  const decoded = CypressJunitReport.decode(parsedReport); // Either<Errors, User>
  if (isLeft(decoded)) {
    return { error: `Could not validate data: ${PathReporter.report(decoded).join("\n")}` }
  }

  const valid: t.TypeOf<typeof CypressJunitReport> = decoded.right;

  // TODO: explain why the first element in the array is different and why we care.
  for (let index = 0; index < valid.testsuites.testsuite.length; index++) {
    const testsuite = valid.testsuites.testsuite[index];
    if (index === 0) {
      if (!CypressJunitRootTestSuite.is(testsuite)) {
        return { error: 'The first suite must be the Root Suite, which contains the spec file name.' };
      }
    } else {
      if (!CypressJunitTestSuite.is(testsuite)) {
        return { error: 'All testsuite elements except for the first one must have testcase elements' };
      } else {
        for (const testcase of testsuite.testcase) {
          if (testcase.$.classname.indexOf('·') !== -1) {
            // TODO, explain what this means
            return { error : 'This report has already been transformed' };
          }
        }
      }
    }
  }

  // success
  return { result: 'success' };
}

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
