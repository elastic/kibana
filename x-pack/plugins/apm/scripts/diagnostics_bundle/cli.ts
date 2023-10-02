/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import { URL } from 'url';
import datemath from '@elastic/datemath';
import { errors } from '@elastic/elasticsearch';
import axios, { AxiosError } from 'axios';
import yargs from 'yargs';
import { initDiagnosticsBundle } from './diagnostics_bundle';

async function init() {
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
    .option('local', {
      type: 'boolean',
      description: 'Connect to local cluster',
      default: false,
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

  const { kuery, apiKey, cloudId } = argv;
  let esHost = argv.esHost;
  let kbHost = argv.kbHost;
  let password = argv.password;
  let username = argv.username;

  const rangeFrom = argv.rangeFrom as unknown as number;
  const rangeTo = argv.rangeTo as unknown as number;

  if (argv.local) {
    esHost = 'http://localhost:9200';
    kbHost = 'http://127.0.0.1:5601';
    password = 'changeme';
    username = 'elastic';
  }

  if ((!esHost || !kbHost) && !cloudId) {
    console.error(
      'Please provide either: --esHost and --kbHost or --cloudId\n'
    );

    console.log('Example 1:');
    console.log(
      '--kbHost https://foo.kb.us-west2.gcp.elastic-cloud.com --esHost https://foo.es.us-west2.gcp.elastic-cloud.com\n'
    );

    console.log('Example 2:');
    console.log('--cloudId foo:very_secret\n');

    console.log('Example 3:');
    console.log('--local');
    process.exit(1);
  }

  if ((!username || !password) && !apiKey) {
    console.error(
      'Please provide either: --username and --password or --apiKey \n'
    );

    console.log('Example 1:');
    console.log('--username elastic --password changeme\n');

    console.log('Example 2:');
    console.log('--apiKey very_secret\n');

    console.log('Example 3:');
    console.log('--local');
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
    kbHost: await getHostnameWithBasePath(kbHost),
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
}

init();

function convertDate(dateString: string): number {
  const parsed = datemath.parse(dateString);
  if (parsed && parsed.isValid()) {
    return parsed.valueOf();
  }

  throw new Error(`Incorrect argument: ${dateString}`);
}

async function getHostnameWithBasePath(kibanaHostname?: string) {
  if (!kibanaHostname) {
    return;
  }

  const parsedHostName = parseHostName(kibanaHostname);

  try {
    await axios.get(parsedHostName, { maxRedirects: 0 });
  } catch (e) {
    if (isAxiosError(e) && e.response?.status === 302) {
      const location = e.response?.headers?.location ?? '';
      return `${parsedHostName}${location}`;
    }

    throw e;
  }

  return parsedHostName;
}

function parseHostName(hostname: string) {
  // replace localhost with 127.0.0.1
  // https://github.com/node-fetch/node-fetch/issues/1624#issuecomment-1235826631
  hostname = hostname.replace('localhost', '127.0.0.1');

  // extract just the hostname in case user provided a full URL
  const parsedUrl = new URL(hostname);
  return parsedUrl.origin;
}

export function isAxiosError(e: AxiosError | Error): e is AxiosError {
  return 'isAxiosError' in e;
}
