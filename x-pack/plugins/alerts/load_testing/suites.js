/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/** @typedef { import('./lib/types').Suite } Suite */
/** @typedef { import('./lib/types').Scenario } Scenario */

const Versions = [
  // '7.11.0-SNAPSHOT', unstable
  '7.10.0',
  '7.9.3',
  // '7.8.1', old api version?
];
const Version = Versions[0];

const AlertsList = [100, 500, 1000, 2000, 4000];

/** @type { Suite[] } */
const suites = (module.exports = []);

suites.push(...withAlerts(suiteKibanaSizes));
suites.push(...withAlerts(suiteTmMaxWorkers));
suites.push(...withAlerts(suiteTmPollInterval));
suites.push(...withAlerts(suiteVersions));
suites.push(suiteAlerts());

/** @type { ( fn: (alerts: number) => Suite) => Suite[] } */
function withAlerts(fn) {
  return AlertsList.map((alerts) => fn(alerts));
}

/** @type { (alerts: number) => Suite } */
function suiteKibanaSizes(alerts) {
  const sizes = [
    { esSpec: '1 x 1 GB', kbSpec: '1 x 1 GB' },
    { esSpec: '1 x 4 GB', kbSpec: '2 x 8 GB' },
    { esSpec: '1 x 8 GB', kbSpec: '4 x 8 GB' },
    { esSpec: '1 x 15 GB', kbSpec: '8 x 8 GB' },
  ];

  const scenarios = sizes.map((size) => ({
    name: `kb: ${size.kbSpec}; es: ${size.esSpec}`,
    alertInterval: '1m',
    alerts,
    esSpec: size.esSpec,
    kbSpec: size.kbSpec,
    tmMaxWorkers: 10,
    tmPollInterval: 3000,
    version: Version,
  }));

  return {
    id: `deployment-size-${alerts}`,
    description: `vary scenarios by deployment size for ${alerts} alerts`,
    scenarios,
  };
}

/** @type { (alerts: number) => Suite } */
function suiteTmMaxWorkers(alerts) {
  const tmMaxWorkersList = [10, 15, 20];

  const scenarios = tmMaxWorkersList.map((tmMaxWorkers) => {
    return {
      name: `tm max workers: ${tmMaxWorkers}`,
      alertInterval: '1m',
      alerts,
      esSpec: '1 x 8 GB',
      kbSpec: '2 x 8 GB',
      tmMaxWorkers,
      tmPollInterval: 3000,
      version: Version,
    };
  });

  return {
    id: `tm-max-workers-${alerts}`,
    description: `vary scenarios by TM max workers for ${alerts} alerts`,
    scenarios,
  };
}

/** @type { (alerts: number) => Suite } */
function suiteTmPollInterval(alerts) {
  const tmPollIntervalList = [3000, 2000, 1000, 500];

  const scenarios = tmPollIntervalList.map((tmPollInterval) => {
    return {
      name: `tm poll interval: ${tmPollInterval}`,
      alertInterval: '1m',
      alerts,
      esSpec: '1 x 8 GB',
      kbSpec: '2 x 8 GB',
      tmMaxWorkers: 10,
      tmPollInterval,
      version: Version,
    };
  });

  return {
    id: `tm-poll-interval-${alerts}`,
    description: `vary scenarios by TM poll interval for ${alerts} alerts`,
    scenarios,
  };
}

/** @type { (alerts: number) => Suite } */
function suiteVersions(alerts) {
  const scenarios = Versions.map((version) => {
    return {
      name: `stack version: ${version}`,
      alertInterval: '1m',
      alerts,
      esSpec: '1 x 8 GB',
      kbSpec: '2 x 8 GB',
      tmMaxWorkers: 10,
      tmPollInterval: 3000,
      version,
    };
  });

  return {
    id: `stack-versions-${alerts}`,
    description: `vary scenarios by stack version for ${alerts} alerts`,
    scenarios,
  };
}

/** @type { () => Suite } */
function suiteAlerts() {
  const scenarios = AlertsList.slice(0, 4).map((alerts) => {
    return {
      name: `alerts: ${alerts}`,
      alertInterval: '1m',
      alerts,
      esSpec: '1 x 8 GB',
      kbSpec: '2 x 8 GB',
      tmMaxWorkers: 10,
      tmPollInterval: 3000,
      version: Version,
    };
  });

  return {
    id: `number-of-alerts`,
    description: `vary scenarios by number of alerts`,
    scenarios,
  };
}
