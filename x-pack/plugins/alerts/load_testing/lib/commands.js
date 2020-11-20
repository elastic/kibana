/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/** @typedef { import('./types').Deployment } Deployment */
/** @typedef { import('./types').CommandHandler } CommandHandler */
/** @typedef { import('./types').EventLogRecord } EventLogRecord */

const path = require('path');
const { homedir } = require('os');
const pkg = require('../package.json');
const logger = require('./logger');
const ecCommands = require('./ec_commands');
const { createDeployment, DeploymentPrefix } = require('./deployment');
const parseArgs = require('./parse_args');
const { getSuite, getSuites, validateSuite } = require('./suites');
const { createAlert, getKbStatus } = require('./kb');
const { getEventLog, getEsStatus } = require('./es');
const { generateReport } = require('./report');
const { delay, shortDateString, arrayFrom, sortByDate } = require('./utils');
const { runQueue } = require('./work_queue');

module.exports = {
  commands: [run, help, ls, lsv, lsd, rmd, rmdall, env],
};

const CONCURRENT_ALERT_CREATION = 40;
const STATS_INTERVAL_MILLIS = 15 * 1000;

/** @type { CommandHandler } */
async function run({ config, minutes }, [suiteId]) {
  if (suiteId == null) {
    return logger.logErrorAndExit('suite id must passed as an parameter');
  }

  const suite = getSuite(suiteId);
  if (suite == null) {
    return logger.logErrorAndExit(`no suite with id "${suiteId}"`);
  }

  try {
    validateSuite(suite);
  } catch (err) {
    return logger.logErrorAndExit(`invalid suite: ${err.message}`);
  }

  logger.printTime(true);
  await listOldDeployments(config);

  const date = new Date();
  const runName = shortDateString(date);
  const scenarios = suite.scenarios;

  logger.log(`creating deployments for config ${config}`);
  const deploymentPromises = scenarios.map((scenario) =>
    createDeployment(config, runName, suite, scenario)
  );

  try {
    await Promise.all(deploymentPromises);
  } catch (err) {
    logger.log(`error creating deployments: ${err}`);
    logger.log(``);
    return logger.logErrorAndExit(
      `You will need to manually shutdown any deployments that started.`
    );
  }

  /** @type { Deployment[] } */
  const deployments = [];
  for (const deploymentPromise of deploymentPromises) {
    deployments.push(await deploymentPromise);
  }

  logger.log('');
  for (const deployment of deployments) {
    logger.log(`deployment ${deployment.id} ${deployment.scenario.name}`);
    logger.log(`  es: ${deployment.esUrl}`);
    logger.log(`  kb: ${deployment.kbUrl}`);
    logger.log('');
  }

  logger.log('starting stats collection');
  /** @type { any[] } */
  const kbStatusList = [];
  /** @type { any[] } */
  const esStatusList = [];
  const interval = setInterval(async () => {
    updateKbStatus(deployments, kbStatusList);
    updateEsStatus(deployments, esStatusList);
  }, STATS_INTERVAL_MILLIS);

  logger.log(`TBD ... creating actions`);
  logger.log(`TBD ... creating input indices`);

  logger.log('creating alerts');
  const queues = deployments.map((deployment) => {
    const alertNames = arrayFrom(deployment.scenario.alerts, (i) => `${i}`.padStart(5, '0'));
    return runQueue(alertNames, CONCURRENT_ALERT_CREATION, async (alertName) => {
      try {
        return await createAlert(deployment.kbUrl, alertName);
      } catch (err) {
        logger.log(
          `error creating alert ${alertName} in ${deployment.scenario.name}, but continuing: ${err.message}`
        );
      }
    });
  });
  await Promise.all(queues);

  logger.log(`running for ${minutes} minute(s)`);
  await delay(minutes * 60 * 1000);

  clearInterval(interval);

  logger.log(`capturing event logs`);
  /** @type { EventLogRecord[] } */
  let completeLog = [];
  for (const deployment of deployments) {
    const eventLog = await getEventLog(`${deployment.scenario.sortName}`, deployment.esUrl);
    completeLog = completeLog.concat(eventLog);
  }

  completeLog.sort(sortByDate);
  logger.log(`generating report`);
  generateReport(runName, suite, deployments, completeLog, kbStatusList, esStatusList);

  logger.log('');
  logger.log(`deleting deployments`);
  const deletePromises = deployments.map((deployment) => deployment.delete());
  await Promise.all(deletePromises);
  logger.log(`deployments deleted`);

  await listOldDeployments(config);

  /** @type { (deployments: Deployment[], kbStatusList: any[]) => Promise<void> } */
  async function updateKbStatus(deployments, kbStatusList) {
    for (const deployment of deployments) {
      try {
        const status = await getKbStatus(deployment.kbUrl);
        status.scenario = deployment.scenario.sortName;
        delete status.status; // don't need this info, save some space
        kbStatusList.push(status);
      } catch (err) {
        logger.log(`error getting kb stats from ${deployment.scenario.name}: ${err}`);
      }
    }
  }

  /** @type { (deployments: Deployment[], esStatusList: any[]) => Promise<void> } */
  async function updateEsStatus(deployments, esStatusList) {
    for (const deployment of deployments) {
      try {
        const statuses = await getEsStatus(deployment.esUrl);
        for (const status of statuses) {
          status.scenario = deployment.scenario.sortName;
          status.date = new Date().toISOString();
          esStatusList.push(status);
        }
      } catch (err) {
        logger.log(`error getting es stats from ${deployment.scenario.name}: ${err}`);
      }
    }
  }
}

/** @type { CommandHandler } */
async function env({ config, minutes }) {
  logger.log('current environment:');
  logger.log(`  minutes:   ${minutes}`);
  logger.log(`  config:    ${config}`);

  const configFile = path.join(homedir(), '.ecctl', `${config}.json`);
  /** @type { any } */
  let configData = {};
  try {
    // eslint-disable-next-line import/no-dynamic-require
    configData = require(configFile);
    logger.log(`     host:   ${configData.host}`);
    logger.log(`     region: ${configData.region}`);
  } catch (err) {
    logger.log(`    error reading config file "${configFile}": ${err}`);
  }
}

/** @type { CommandHandler } */
async function ls() {
  const suites = getSuites();
  for (const { id, description, scenarios } of suites) {
    logger.log(`suite: ${id} - ${description}`);
    for (const scenario of scenarios) {
      logger.log(`    ${scenario.name}`);
    }
  }

  for (const suite of suites) {
    try {
      validateSuite(suite);
    } catch (err) {
      logger.log(`error: ${err.message}`);
    }
  }
}

/** @type { CommandHandler } */
async function lsv() {
  const suites = getSuites();
  for (const { id, description, scenarios } of suites) {
    logger.log(`suite: ${id} - ${description}`);
    for (const scenario of scenarios) {
      const prefix1 = `    `;
      const prefix2 = `${prefix1}${prefix1}`;
      logger.log(`${prefix1}${scenario.name}`);
      logger.log(`${prefix2}version:        ${scenario.version}`);
      logger.log(`${prefix2}esSpec:         ${scenario.esSpec}`);
      logger.log(`${prefix2}kbSpec:         ${scenario.kbSpec}`);
      logger.log(`${prefix2}alerts:         ${scenario.alerts}`);
      logger.log(`${prefix2}alertInterval:  ${scenario.alertInterval}`);
      logger.log(`${prefix2}tmPollInterval: ${scenario.tmPollInterval}`);
      logger.log(`${prefix2}tmMaxWorkers:   ${scenario.tmMaxWorkers}`);
    }
    logger.log('');
  }

  for (const suite of suites) {
    try {
      validateSuite(suite);
    } catch (err) {
      logger.log(`error: ${err.message}`);
    }
  }
}

/** @type { CommandHandler } */
async function lsd({ config }) {
  const deployments = await getDeployments(config);
  for (const { name, id } of deployments) {
    logger.log(`${id} - ${name}`);
  }
}

/** @type { CommandHandler } */
async function rmd({ config }, [pattern]) {
  if (pattern == null) {
    return logger.logErrorAndExit('deployment pattern must be passed as a parameter');
  }

  const deployments = await getDeployments(config);
  for (const { name, id } of deployments) {
    if (pattern !== '*' && name.indexOf(pattern) === -1) continue;

    logger.log(`deleting deployment ${id} - ${name}`);

    try {
      await ecCommands.deleteDeployment({ config, id, name });
    } catch (err) {
      logger.log(`error deleting deployment: ${err}`);
    }
  }
}

/** @type { CommandHandler } */
async function rmdall({ config }) {
  return await rmd({ config, minutes: 0 }, ['*']);
}

/** @type { CommandHandler } */
async function help() {
  console.log(parseArgs.help);
}

/** @type { (config: string) => Promise<{ id: string, name: string }[]> } */
async function getDeployments(config) {
  /** @type { { deployments: { id: string, name: string }[] } } */
  const { deployments } = await ecCommands.listDeployments({ config });

  return deployments
    .filter(({ name }) => name.startsWith(DeploymentPrefix))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** @type { (config: string) => Promise<void> } */
async function listOldDeployments(config) {
  const deployments = await getDeployments(config);
  if (deployments.length === 0) return;

  logger.log('');
  logger.log('currently running (old?) deployments:');
  await lsd({ config, minutes: 0 });
  logger.log(`(use "${pkg.name} rmd" or "${pkg.name} rmdall" to delete)`);
  logger.log('');
}
