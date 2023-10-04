/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import datemath from '@elastic/datemath';
import yargs from 'yargs';
import { initDiagnosticsBundle } from './diagnostics_bundle';

const { argv } = yargs(process.argv.slice(2))
  .option('esHost', {
    demandOption: true,
    type: 'string',
    description: 'Elasticsearch host name',
  })
  .option('kbHost', {
    demandOption: true,
    type: 'string',
    description: 'Kibana host name',
  })
  .option('username', {
    demandOption: true,
    type: 'string',
    description: 'Kibana host name',
  })
  .option('password', {
    demandOption: true,
    type: 'string',
    description: 'Kibana host name',
  })
  .option('rangeFrom', {
    type: 'string',
    description: 'Time-range start',
    coerce: convertDate,
  })
  .option('rangeTo', {
    type: 'string',
    description: 'Time range end',
    coerce: convertDate,
  })
  .option('kuery', {
    type: 'string',
    description: 'KQL query to filter documents by',
  })
  .help();

const { esHost, kbHost, password, username, kuery } = argv;
const rangeFrom = argv.rangeFrom as unknown as number;
const rangeTo = argv.rangeTo as unknown as number;

if (rangeFrom) {
  console.log(`rangeFrom = ${new Date(rangeFrom).toISOString()}`);
}

if (rangeTo) {
  console.log(`rangeTo = ${new Date(rangeTo).toISOString()}`);
}

initDiagnosticsBundle({
  esHost,
  kbHost,
  password,
  username,
  start: rangeFrom,
  end: rangeTo,
  kuery,
})
  .then((res) => {
    console.log(res);
  })
  .catch((err) => {
    console.log(err);
  });

function convertDate(dateString: string): number {
  const parsed = datemath.parse(dateString);
  if (parsed && parsed.isValid()) {
    return parsed.valueOf();
  }

  throw new Error(`Incorrect argument: ${dateString}`);
}
