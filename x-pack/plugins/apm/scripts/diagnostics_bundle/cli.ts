/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import datemath from '@elastic/datemath';
import { errors } from '@elastic/elasticsearch';
import { AxiosError } from 'axios';
import yargs from 'yargs';
import { initDiagnosticsBundle } from './diagnostics_bundle';

const { argv } = yargs(process.argv.slice(2))
  .option('esHost', {
    type: 'string',
    description: 'Elasticsearch host name',
  })
  .option('kbHost', {
    type: 'string',
    description: 'Kibana host name',
  })
  .option('username', {
    type: 'string',
    description: 'Kibana host name',
  })
  .option('password', {
    type: 'string',
    description: 'Kibana host name',
  })
  .option('cloudId', {
    type: 'string',
  })
  .option('apiKey', {
    type: 'string',
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

const { esHost, kbHost, password, username, kuery, apiKey, cloudId } = argv;
const rangeFrom = argv.rangeFrom as unknown as number;
const rangeTo = argv.rangeTo as unknown as number;

if ((!esHost || !kbHost) && !cloudId) {
  console.error('Either esHost and kbHost or cloudId must be provided');
  process.exit(1);
}

if ((!username || !password) && !apiKey) {
  console.error('Either username and password or apiKey must be provided');
  process.exit(1);
}

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
  apiKey,
  cloudId,
  username,
  start: rangeFrom,
  end: rangeTo,
  kuery,
})
  .then((res) => {
    console.log(res);
  })
  .catch((err) => {
    process.exitCode = 1;
    if (err instanceof AxiosError && err.response?.data) {
      console.error(err.response.data);
      return;
    }

    // @ts-expect-error
    if (err instanceof errors.ResponseError && err.meta.body.error.reason) {
      // @ts-expect-error
      console.error(err.meta.body.error.reason);
      return;
    }

    console.error(err);
  });

function convertDate(dateString: string): number {
  const parsed = datemath.parse(dateString);
  if (parsed && parsed.isValid()) {
    return parsed.valueOf();
  }

  throw new Error(`Incorrect argument: ${dateString}`);
}
