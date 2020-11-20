/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/** @typedef { import('./types').Suite } Suite */
/** @typedef { import('./types').Scenario } Scenario */
/** @typedef { import('./types').Deployment } Deployment */
/** @typedef { import('./types').EventLogRecord } EventLogRecord */

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

module.exports = {
  generateReport,
};

/** @type { (runName: string, suite: Suite, deployments: Deployment[], eventLog: EventLogRecord[], kbStatus: any[], esStatus: any[]) => void } */
function generateReport(runName, suite, deployments, eventLog, kbStatus, esStatus) {
  const { zone } = deployments[0];
  const reportName = `${runName}-${suite.id}`;
  const content = readTemplate()
    .replace('"%Suite%"', JSON.stringify(suite))
    .replace('["%Deployments%"]', JSON.stringify(deployments))
    .replace('["%EventLog%"]', JSON.stringify(eventLog))
    .replace('["%KbStatus%"]', JSON.stringify(kbStatus))
    .replace('["%EsStatus%"]', JSON.stringify(esStatus))
    .replace(/%reportName%/g, reportName)
    .replace(/%zone%/g, `${zone}`)
    .replace(/%date%/g, `${new Date()}`)
    .replace(/%dateISO%/g, new Date().toISOString());

  const fileName = `${reportName}.html`;
  fs.writeFileSync(fileName, content, 'utf8');
  logger.log(`${new Date().toISOString()}: generated report ${fileName}`);
}

/** @type { () => string } */
function readTemplate() {
  const fileName = path.join(`${__dirname}`, 'report_template.html');
  return fs.readFileSync(fileName, 'utf8');
}

// @ts-ignore
if (require.main === module) test();

// to re-run on changes:
//    nodemon -w ../lib/report.js -w ../lib/report-template.html node ../lib/report.js
async function test() {
  const existingReportFileName = process.argv[2];
  if (existingReportFileName == null) {
    logger.logErrorAndExit('you must provide an existing report to pull the data from');
  }

  /** @type { string } */
  let existingReport;
  try {
    existingReport = fs.readFileSync(existingReportFileName, 'utf8');
  } catch (err) {
    logger.logErrorAndExit(`error reading existing report "${existingReportFileName}": ${err}`);
  }

  /** @type { string[] } */
  const dataLines = [];
  const existingReportLines = existingReport.split(/\n/g);
  let inData = false;
  for (const line of existingReportLines) {
    if (line.trimStart() === '// data-start') {
      inData = true;
      continue;
    }
    if (line.trimStart() === '// data-end') {
      break;
    }
    if (inData) {
      dataLines.push(line);
    }
  }

  const existingData = dataLines.join('\n');

  const template = readTemplate();

  /** @type { string[] } */
  const reportLines = [];
  const templateLines = template.split(/\n/g);
  inData = false;
  for (const line of templateLines) {
    if (line.trimStart() === '// data-start') {
      inData = true;
      reportLines.push(line);
      reportLines.push(existingData);
      continue;
    }
    if (line.trimStart() === '// data-end') {
      reportLines.push(line);
      inData = false;
      continue;
    }
    if (!inData) {
      reportLines.push(line);
    }
  }

  const report = reportLines.join('\n');
  const fileName = `test-report.html`;
  fs.writeFileSync(fileName, report, 'utf8');
  logger.log(`generated test report ${fileName} from data in ${existingReportFileName}`);
}
