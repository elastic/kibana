/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import globby from 'globby';
import pMap from 'p-map';
import deepMerge from 'deepmerge';
import runCypress from '.';
import { renderSummaryTable } from './print_run';

export default async () => {
  const argv = process.argv.slice(2);

  const files = await globby([
    // 'cypress/e2e/cases/creation.cy.ts',
    // 'cypress/e2e/cases/privileges.cy.ts',
    '**/cypress/e2e/cases/*.cy.ts',
    // '**/cypress/e2e/detection_alerts/*.cy.ts',
    // '**/cypress/e2e/detection_rules/*.cy.ts',
  ]);

  // console.error('process', process);
  console.error('process.argv', argv);
  console.error('files', files);

  const esPorts: number[] = [];
  const kibanaPorts: number[] = [];

  const getEsPort = () => {
    console.error('getEsPort', esPorts);
    const esPort = parseInt(`92${Math.floor(Math.random() * 89) + 10}`, 10);
    if (esPorts.includes(esPort)) {
      return getEsPort();
    }
    esPorts.push(esPort);
    return esPort;
  };

  const getKibanaPort = () => {
    console.error('getKibanaPort', kibanaPorts);
    const kibanaPort = parseInt(`56${Math.floor(Math.random() * 89) + 10}`, 10);
    if (kibanaPorts.includes(kibanaPort)) {
      return getKibanaPort();
    }
    kibanaPorts.push(kibanaPort);
    return kibanaPort;
  };

  const cleanupServerPorts = ({ esPort, kibanaPort }) => {
    _.pull(esPorts, esPort);
    _.pull(kibanaPorts, kibanaPort);
  };

  // merge({
  //   files: ['../../../target/kibana-security-solution/cypress/results/*.json'],
  // }).then((report) => {
  //   console.error('report', report);
  //   const reporter = new Spec({ stats: report.stats, on: () => {}, once: () => {} });
  //   reporter.epilogue();
  //   renderSummaryTable(undefined, report);
  //   process.exit();
  // });

  // renderSummaryTable(undefined, deepMerge.all(results));

  await pMap(
    files,
    (filePath, index) => {
      const esPort = getEsPort();
      const kibanaPort = getKibanaPort();
      return runCypress({ esPort, kibanaPort, filePath, index, argv })
        .then((result) => {
          cleanupServerPorts({ esPort, kibanaPort });
          return result;
        })
        .catch((error) => {
          cleanupServerPorts({ esPort, kibanaPort });
          return error;
        });
    },
    { concurrency: 3 }
  ).then((results) => {
    // console.error('results', JSON.stringify(results));

    renderSummaryTable(undefined, deepMerge.all(results));
    process.exit(_.some(results, (result) => result.failures > 0) ? 1 : 0);
  });
  // ).then(() => {
  //   merge({
  //     files: ['../../../target/kibana-security-solution/cypress/results/*.json'],
  //   }).then((report) => {
  //     const reporter = new Spec({ stats: report.stats, on: () => {} });
  //     reporter.epilogue();
  //     process.exit();
  //   });
  // });
};
