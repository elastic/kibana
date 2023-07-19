import { createFlagError } from '@kbn/dev-cli-errors';
import { run } from '@kbn/dev-cli-runner';
import { Builder, parseStringPromise } from 'xml2js';
import { promises as fs } from 'fs';
import { relative } from 'path';
import * as t from 'io-ts';
import { isLeft } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';

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

function isCypressJunitReport(parsedReport: any): parsedReport is t.TypeOf<typeof CypressJunitReport> {
  const decoded = CypressJunitReport.decode(parsedReport); // Either<Errors, User>
  if (isLeft(decoded)) {
    throw Error(
      `Could not validate data: ${PathReporter.report(decoded).join("\n")}`
    );
    // e.g.: Could not validate data: Invalid value "foo" supplied to : { userId: number, name: string }/userId: number
  }

  const valid: t.TypeOf<typeof CypressJunitReport> = decoded.right;

  for (let index = 0; index < valid.testsuites.testsuite.length; index++) {
    const testsuite = valid.testsuites.testsuite[index];
    if (index === 0) {
      if (isLeft(CypressJunitRootTestSuite.decode(testsuite))) {
        throw new Error('The first suite must be the Root Suite, which contains the spec file name.');
      }
    } else {
      if (isLeft(CypressJunitTestSuite.decode(testsuite))) {
        throw new Error('All testsuite elements except for the first one must have testcase elements');
      }
    }
  }

  return true;
}

run(
  async ({ flags, log }) => {
    if (typeof flags.path !== 'string' || flags.path.length === 0) {
      throw createFlagError('please provide a single --path flag');
    }

    if (typeof flags.rootDirectory !== 'string' || flags.rootDirectory.length === 0) {
      throw createFlagError('please provide a single --rootDirectory flag');
    }

    if (typeof flags.reportName !== 'string' || flags.reportName.length === 0) {
      throw createFlagError('please provide a single --reportName flag');
    }

    console.log('flags', flags);

    console.log(await runTask({
      path: flags.path,
      reportName: flags.reportName,
      rootDirectory: flags.rootDirectory
    }));
    log.success('task complete');
  },
  {
    description: `
      Transform junit reports to match the style required by kibana operations flaky test triage workflows such as '/skip'.
    `,
    flags: {
      string: ['path', 'rootDirectory', 'reportName'],
      boolean: ['dryRun'],
      help: `
        --path             Required, path to the file to operate on
        --rootDirectory    Required, path of the kibana repo
        --reportName       Required, used as a prefix for the classname. Eventually shows up in the title of flaky test Github issues
        --writeInPlace     Defaults to false. If passed, rewrite the file in place with transformations. If false, the script will pass the transformed XML as a string to stdout
      `
    },
  }
);


async function runTask({ path, rootDirectory, reportName }: { path: string, rootDirectory: string, reportName: string }): Promise<string> {
  const source = await fs.readFile(path, 'utf8');
  const result = await parseStringPromise(source /*, options */);
  if (isCypressJunitReport(result)) {
    console.log(JSON.stringify(result, undefined, '\t'));
    console.log('Done');

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
      return builder.buildObject(result);
    }
  }
}
