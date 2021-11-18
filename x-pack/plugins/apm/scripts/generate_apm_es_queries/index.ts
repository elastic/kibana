/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import yargs from 'yargs';
import { callApmEndpoints } from './call_apm_endpoints';
import { generateTraceData } from './generate_trace_data';
import { createEmptyMappings } from './generate_empty_mappings';

/*
Usage: node x-pack/plugins/apm/scripts/generate_apm_es_queries \
  --es-url='http://elastic:changeme@localhost:9200' \
  --kibana-url='http://elastic:changeme@localhost:5601/njc'
*/

async function init() {
  const { argv } = yargs(process.argv.slice(2))
    .option('esUrl', {
      describe: 'Elasticsearch target, including username/password',
      demandOption: true,
      string: true,
    })
    .option('kibanaUrl', {
      describe: 'Kibana target, including username/password',
      demandOption: true,
      string: true,
    });

  const { esUrl, kibanaUrl } = argv;

  const serviceName = 'sorens-service';
  const environment = 'testing';
  const start = '2021-11-17T17:00:00.000Z';
  const end = '2021-11-17T17:15:00.000Z';

  // createEmptyMappings({ esUrl, kibanaUrl });
  const traceEvents = await generateTraceData({
    serviceName,
    environment,
    start,
    end,
    esUrl,
  });

  const responses = await callApmEndpoints({
    kibanaUrl,
    traceEvents,
    serviceName,
    environment,
    start,
    end,
  });
  console.log(JSON.stringify(responses, null, 2));
}

init();
