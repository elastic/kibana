/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { KbnClient } from '@kbn/test';
import FormData from 'form-data';

const PIPELINE_NAME = 'insights_pipeline';
const DIRECTORY_PATH = path.resolve(
  __dirname,
  '../../../../../../x-pack/test/security_solution_cypress/cypress/fixtures/assistant/attack_discovery'
);
const MAPPING_FILE_PATH = path.join(DIRECTORY_PATH, 'mapping.json');

const enableRule = async ({
  kbnClient,
  ruleId,
  log,
}: {
  kbnClient: KbnClient;
  ruleId: string;
  log: ToolingLog;
}) => {
  log.info(`Enabling rule with ID: ${ruleId}...`);
  try {
    await kbnClient.request({
      method: 'POST',
      path: `/api/detection_engine/rules/_bulk_action`,
      body: {
        action: 'enable',
        ids: [ruleId],
      },
      headers: {
        'elastic-api-version': '2023-10-31',
      },
    });

    log.info(`Rule with ID ${ruleId} has been enabled.`);
  } catch (error) {
    log.error(`Error enabling rule with ID ${ruleId}:`);
    log.error(error);
  }
};

const getRule = async ({ kbnClient, log }: { kbnClient: KbnClient; log: ToolingLog }) => {
  const response = await kbnClient.request<{
    total: number;
    data?: Array<{ id: string; enabled: boolean; rule_id: string }>;
  }>({
    method: 'GET',
    path: `/api/detection_engine/rules/_find?page=1&per_page=5&sort_field=enabled&sort_order=asc&filter=alert.attributes.name:%22Endpoint%20Security%20%5BInsights%5D%22`,
    headers: {
      'elastic-api-version': '2023-10-31',
    },
  });

  return response.data.data?.[0];
};

const importRule = async ({ kbnClient, log }: { kbnClient: KbnClient; log: ToolingLog }) => {
  log.info('Importing rule from endpoint_alert.ndjson...');

  const RULE_FILE_PATH = path.join(DIRECTORY_PATH, 'endpoint_alert.ndjson');

  const formData = new FormData();
  formData.append('file', fs.createReadStream(RULE_FILE_PATH), RULE_FILE_PATH);

  try {
    await kbnClient.request({
      method: 'POST',
      path: `/api/detection_engine/rules/_import`,
      headers: {
        'kbn-xsrf': 'true',
        'Content-Type': 'multipart/form-data',
        'elastic-api-version': '2023-10-31',
      },
      body: formData,
    });

    const ruleId = (await getRule({ kbnClient, log }))?.id;

    if (!ruleId) throw new Error('Failed to import rule');

    await enableRule({ kbnClient, ruleId, log });
  } catch (error) {
    log.error('Error importing rule:');
    log.error(error);
  }
};

const createPipeline = async ({ esClient, log }: { esClient: Client; log: ToolingLog }) => {
  try {
    await esClient.ingest.getPipeline({ id: PIPELINE_NAME });

    log.info(`Ingest pipeline ${PIPELINE_NAME} already exists.`);
  } catch (error) {
    if (error.meta?.statusCode === 404) {
      log.info(`Creating ingest pipeline ${PIPELINE_NAME}...`);

      const pipelineConfig = {
        description: 'Ingest pipeline created by script',
        processors: [
          {
            date: {
              field: '@timestamp',
              formats: ['ISO8601'],
              output_format: "yyyy-MM-dd'T'HH:mm:ss.SSSSSSSSSXXX",
            },
          },
          {
            set: {
              field: 'event.ingested',
              value: '{{_ingest.timestamp}}',
            },
          },
        ],
      };

      await esClient.ingest.putPipeline({
        id: PIPELINE_NAME,
        body: pipelineConfig,
      });
    } else {
      log.error('Error checking or creating ingest pipeline:');
      log.error(error);
    }
  }
};

const createAndConfigureIndex = async ({
  esClient,
  epNum,
  indexType,
  log,
}: {
  esClient: Client;
  epNum: string;
  indexType: string;
  log: ToolingLog;
}) => {
  const indexNameSuffix = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
  let indexName: string;

  if (indexType === 'alerts') {
    indexName = `insights-alerts-ep${epNum}-${indexNameSuffix}`;
  } else {
    indexName = `logs-endpoint.events.insights.ep${epNum}.${indexNameSuffix}`;
  }

  try {
    const mappingData = fs.readFileSync(MAPPING_FILE_PATH, 'utf8');

    const indexExists = await esClient.indices.exists({ index: indexName });

    if (!indexExists) {
      log.info(`Creating and configuring Elasticsearch index: ${indexName}`);
      await esClient.indices.create({
        index: indexName,
        body: {
          settings: {
            'index.mapping.total_fields.limit': '6000',
          },
          mappings: JSON.parse(mappingData),
        },
      });
    }
  } catch (error) {
    log.error(`Error creating and configuring index ${indexName}:`);
    log.error(error);
  }
};

const processFile = async ({
  esClient,
  file,
  indexType,
  log,
}: {
  esClient: Client;
  file: string;
  indexType: string;
  log: ToolingLog;
}) => {
  const epNum = path.basename(file).match(/ep(\d+)/)?.[1];

  await createAndConfigureIndex({ esClient, epNum: epNum as string, indexType, log });

  const indexNameSuffix = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
  let indexName: string;

  if (indexType === 'alerts') {
    indexName = `insights-alerts-ep${epNum}-${indexNameSuffix}`;
  } else {
    indexName = `logs-endpoint.events.insights.ep${epNum}.${indexNameSuffix}`;
  }

  log.info(`Processing and indexing file: ${file} ...`);

  const fileData = await fs.readFileSync(file).toString().split('\n');

  try {
    const response = await esClient.bulk<string>({
      pipeline: PIPELINE_NAME,
      pretty: true,
      body: [
        fileData.reduce((acc, item) => {
          if (!item.length) return acc;

          return acc.concat(`{ "index" : { "_index" : "${indexName}" } }\n${item}\n`);
        }, ''),
      ],
    });
    if (!response.errors) {
      log.info('Success.');
    } else {
      log.info(`Failed with errors.`);
    }
  } catch (error) {
    log.error('Error indexing data:');
    log.error(error);
  }
};

const processFilesForEpisode = async ({
  esClient,
  epNum,
  log,
}: {
  esClient: Client;
  epNum: string;
  log: ToolingLog;
}) => {
  const dataFiles = fs
    .readdirSync(DIRECTORY_PATH)
    .filter((file) => file.includes(`ep${epNum}data.ndjson`));
  const alertFiles = fs
    .readdirSync(DIRECTORY_PATH)
    .filter((file) => file.includes(`ep${epNum}alerts.ndjson`));

  for (const file of dataFiles) {
    await processFile({ esClient, file: path.join(DIRECTORY_PATH, file), indexType: 'data', log });
  }

  for (const file of alertFiles) {
    await processFile({
      esClient,
      file: path.join(DIRECTORY_PATH, file),
      indexType: 'alerts',
      log,
    });
  }
};

const checkRuleExistsAndStatus = async ({
  kbnClient,
  log,
}: {
  kbnClient: KbnClient;
  log: ToolingLog;
}) => {
  log.info("Checking if the rule 'Endpoint Security [Insights]' exists and its status...");

  let rule;

  try {
    rule = await getRule({ kbnClient, log });
  } catch (e) {
    /* empty */
  }

  try {
    if (!rule) {
      await importRule({ kbnClient, log });
    } else if (!rule.enabled) {
      await enableRule({ kbnClient, ruleId: rule.id, log });
    }
  } catch (error) {
    log.error('Error checking rule status:');
    log.error(error);
  }
};

const checkDeleteIndices = async ({ esClient, log }: { esClient: Client; log: ToolingLog }) => {
  const promptDeletion = async (pattern: string, description: string) => {
    try {
      const response = await esClient.cat.indices({
        index: [pattern],
        h: 'index',
      });

      const existingIndices = (response as unknown as string).trim().split(' ');

      if (existingIndices.length > 0) {
        log.info(
          `Found existing ${description} indices matching pattern '${pattern}': ${existingIndices.join(
            ', '
          )}`
        );

        // TODO: add deletion logic
        // for (const index of existingIndices) {
        //   await esClient.indices.delete({ index: pattern });

        //   log.info(`Deleted index ${index}`);
        // }
      } else {
        log.info(`No ${description} indices matching pattern '${pattern}' found.`);
      }
    } catch (error) {
      log.error(`Error checking or deleting ${description} indices:`);
      log.error(error);
    }
  };

  await promptDeletion('logs-endpoint.events.insights.*', 'data');
  await promptDeletion('insights-alerts-*', 'alerts');
};
export const loadAttackDiscoveryData = async ({
  kbnClient,
  esClient,
  log,
}: {
  kbnClient: KbnClient;
  esClient: Client;
  log: ToolingLog;
}) => {
  await checkRuleExistsAndStatus({ kbnClient, log });
  await checkDeleteIndices({ esClient, log });
  await createPipeline({ esClient, log });

  for (const epNum of ['1', '2']) {
    await processFilesForEpisode({ esClient, epNum, log });
  }

  return null;
};
