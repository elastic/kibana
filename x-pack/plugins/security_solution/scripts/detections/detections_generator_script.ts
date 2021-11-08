/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */
import yargs from 'yargs';
import { buildEsQuery, fromKueryExpression } from '@kbn/es-query';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { rawRules } from '../../server/lib/detection_engine/rules/prepackaged_rules';
import { createEventFromKueryNode } from './create_source_event_from_query';

main();

async function main() {
  const argv = yargs.help().options({
    ruleId: {
      alias: 'ruleId',
      describe: 'ruleId to generate events for',
      type: 'string',
    },
    ruleName: {
      alias: 'ruleName',
      describe: 'Rule Name to generate events for',
      type: 'string',
    },
  }).argv;

  let query;
  const kqlRules = rawRules.filter((r) => r.type === 'query');
  if (argv.ruleId) {
    query = kqlRules.find((r) => r.rule_id === argv.ruleId)?.query;
  }
  if (argv.ruleName) {
    console.log(argv.ruleName);
    query = kqlRules.find((r) => r.name === argv.ruleName)?.query;
  }

  // DNS Activity to the Internet
  console.log(query);

  const esQuery = buildEsQuery(undefined, { query, language: 'kuery' }, []);
  console.log(JSON.stringify(esQuery, null, 2));
  const kqlQuery = fromKueryExpression(query);
  console.log(JSON.stringify(createEventFromKueryNode(kqlQuery), null, 2));
}
