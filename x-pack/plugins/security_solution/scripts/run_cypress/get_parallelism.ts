/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import yargs from 'yargs';
import { GraphQLClient } from 'graphql-request';
import { first, filter, reduce } from 'lodash';
import { getRunsFeed } from './gql/getRunsFeed';
import { getRun } from './gql/getRun';

(async () => {
  const { argv } = yargs(process.argv.slice(2));

  const projectName = (argv.projectName as string) ?? 'security_solution';

  const endpoint = 'https://cypress-dasbhoard-director-qup6nhupua-uc.a.run.app';
  const client = new GraphQLClient(endpoint, { method: 'POST' });
  let data;
  try {
    data = await client.request(
      getRunsFeed,
      {
        filters: [
          {
            key: 'meta.projectId',
            value: `${projectName}`,
            like: null,
          },
        ],
        cursor: '',
      },
      { 'Content-Type': 'application/json' }
    );
  } catch (e) {
    console.error('e', e);
  }

  const lastSuccessfulRunId = first(
    filter(
      data.runFeed.runs,
      (item) =>
        item.completion.completed &&
        item.progress.groups[0].instances.overall === item.progress.groups[0].instances.complete &&
        item.progress.groups[0].tests.passes
      // item.progress.groups[0].tests.passes === item.progress.groups[0].tests.overall
    )
  )?.runId;

  const runData = await client.request(getRun, { runId: lastSuccessfulRunId });

  const totalRunTime = reduce(
    runData.run.specs,
    (acc, item) => (acc += item.results.stats.wallClockDuration),
    0
  );

  // try to fit into 25min per agent
  const parallelism = Math.ceil(totalRunTime / 1500000);

  console.log(parallelism);
  return parallelism;
})();
