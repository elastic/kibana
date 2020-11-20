/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/** @typedef { import('./types').Suite } Suite */

const Suites = require('../suites');
const { splitX } = require('./utils');
const { ecctlSize } = require('./deployment');

module.exports = {
  getSuite,
  getSuites,
  validateSuite,
};

// prefix scenario names with sortable index
for (const suite of Suites) {
  let index = 1;
  for (const scenario of suite.scenarios) {
    scenario.sortName = `${index++}: ${scenario.name}`;
  }
}

/** @type { () => Suite[] } */
function getSuites() {
  return clone(Suites);
}

/** @type { (id: string) => Suite | undefined } */
function getSuite(id) {
  return clone(Suites.find((suite) => suite.id === id));
}

/** @type { (suite: Suite) => void } */
function validateSuite({ id, description, scenarios }) {
  if (typeof id !== 'string') throw new Error(`invalid suite.id: "${id}"`);
  if (typeof description !== 'string')
    throw new Error(`invalid suite.description: "${description}"`);
  if (!Array.isArray(scenarios)) throw new Error(`invalid suite.scenarios: not an array`);

  for (const scenario of scenarios) {
    const { name, version, esSpec, kbSpec, alerts, alertInterval } = scenario;
    const { tmMaxWorkers, tmPollInterval } = scenario;

    let prefix = `for suite "${id}",`;
    if (typeof name !== 'string') throw new Error(`${prefix} invalid scenario.name: "${name}"`);

    prefix = `${prefix} scenario "${name}",`;
    if (typeof version !== 'string')
      throw new Error(`${prefix} invalid scenario.version: "${version}"`);
    if (typeof esSpec !== 'string')
      throw new Error(`${prefix} invalid scenario.esSpec: "${esSpec}"`);
    if (typeof kbSpec !== 'string')
      throw new Error(`${prefix} invalid scenario.kbSpec: "${kbSpec}"`);
    if (typeof alerts !== 'number')
      throw new Error(`${prefix} invalid scenario.alerts: "${alerts}"`);
    if (typeof alertInterval !== 'string')
      throw new Error(`${prefix} invalid scenario.alertInterval: "${alertInterval}"`);
    if (typeof tmPollInterval !== 'number')
      throw new Error(`${prefix} invalid scenario.tmPollInterval: "${tmPollInterval}"`);
    if (typeof tmMaxWorkers !== 'number')
      throw new Error(`${prefix} invalid scenario.tmMaxWorkers: "${tmMaxWorkers}"`);

    const esSizes = splitX(esSpec);
    const kbSizes = splitX(kbSpec);
    if (esSizes == null)
      throw new Error(`${prefix} invalid scenario.esSpec: should be in the form MxN`);
    if (kbSizes == null)
      throw new Error(`${prefix} invalid scenario.kbSpec: should be in the form MxN`);

    try {
      ecctlSize(esSpec, 'elasticsearch');
    } catch (err) {
      throw new Error(`${prefix} invalid scenario.esSpec "${esSpec}": ${err.message}`);
    }

    try {
      ecctlSize(kbSpec, 'kibana');
    } catch (err) {
      throw new Error(`${prefix} invalid scenario.kbSpec "${kbSpec}": ${err.message}`);
    }
  }
}

/**
 * @template T
 * @type { (object: T) => T }
 * */
function clone(object) {
  if (object == null) return object;
  return JSON.parse(JSON.stringify(object));
}
