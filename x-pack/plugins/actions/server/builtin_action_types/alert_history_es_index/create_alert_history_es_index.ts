/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from 'src/core/server';
import mappings from './mappings.json';

import { getIndexName, AlertHistoryIlmPolicyName, AlertHistoryIlmPolicy } from './types';

function getAlertHistoryIndexTemplate(indexName: string, ilmPolicyName: string) {
  return {
    index_patterns: [`${indexName}-*`],
    settings: {
      number_of_shards: 1,
      auto_expand_replicas: '0-1',
      'index.lifecycle.name': ilmPolicyName,
      'index.lifecycle.rollover_alias': indexName,
    },
    mappings,
  };
}

async function doesIlmPolicyExist({
  client,
  policyName,
}: {
  client: ElasticsearchClient;
  policyName: string;
}) {
  try {
    await client.transport.request({
      method: 'GET',
      path: `/_ilm/policy/${policyName}`,
    });
  } catch (err) {
    if (err.statusCode === 404) {
      return false;
    } else {
      throw new Error(`error checking existence of ilm policy: ${err.message}`);
    }
  }

  return true;
}

async function createIlmPolicy({
  client,
  policyName,
}: {
  client: ElasticsearchClient;
  policyName: string;
}) {
  try {
    await client.transport.request({
      method: 'PUT',
      path: `/_ilm/policy/${policyName}`,
      body: AlertHistoryIlmPolicy,
    });
  } catch (err) {
    throw new Error(`error creating ilm policy: ${err.message}`);
  }
}

async function createIlmPolicyIfNotExists({
  client,
  policyName,
}: {
  client: ElasticsearchClient;
  policyName: string;
}) {
  const ilmPolicyExists = await doesIlmPolicyExist({ client, policyName });

  if (!ilmPolicyExists) {
    await createIlmPolicy({ client, policyName });
  }
}

async function doesIndexTemplateExist({
  client,
  templateName,
}: {
  client: ElasticsearchClient;
  templateName: string;
}) {
  let result;
  try {
    result = (await client.indices.existsTemplate({ name: templateName })).body;
  } catch (err) {
    throw new Error(`error checking existence of index template: ${err.message}`);
  }

  return result as boolean;
}

async function createIndexTemplate({
  client,
  template,
  templateName,
}: {
  client: ElasticsearchClient;
  template: Record<string, unknown>;
  templateName: string;
}) {
  try {
    await client.indices.putTemplate({
      name: templateName,
      body: template,
      create: true,
    });
  } catch (err) {
    // The error message doesn't have a type attribute we can look to guarantee it's due
    // to the template already existing (only long message) so we'll check ourselves to see
    // if the template now exists. This scenario would happen if you startup multiple Kibana
    // instances at the same time.
    const existsNow = await doesIndexTemplateExist({ client, templateName });
    if (!existsNow) {
      throw new Error(`error creating index template: ${err.message}`);
    }
  }
}

async function createIndexTemplateIfNotExists({
  client,
  template,
  templateName,
}: {
  client: ElasticsearchClient;
  template: Record<string, unknown>;
  templateName: string;
}) {
  const indexTemplateExists = await doesIndexTemplateExist({ client, templateName });

  if (!indexTemplateExists) {
    await createIndexTemplate({ client, template, templateName });
  }
}

export async function createAlertHistoryEsIndex({
  client,
  kibanaVersion,
  logger,
}: {
  client: ElasticsearchClient;
  kibanaVersion: string;
  logger: Logger;
}) {
  try {
    const indexName = getIndexName(kibanaVersion);
    const ilmPolicyName = AlertHistoryIlmPolicyName;
    const indexTemplate = getAlertHistoryIndexTemplate(indexName, ilmPolicyName);

    await createIlmPolicyIfNotExists({ client, policyName: ilmPolicyName });
    await createIndexTemplateIfNotExists({
      client,
      templateName: `${indexName}-template`,
      template: indexTemplate,
    });
  } catch (err) {
    logger.error(`Could not initialize alert history index with mappings: ${err.message}.`);
  }
}
