/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { readdirSync } from 'fs';
import { resolve } from 'path';
import { schema } from '@kbn/config-schema';
import { CoreSetup, PluginInitializerContext } from 'src/core/server';
import { PulsePOCCheckFunction, PulsePOCSetupFunction } from './types';

interface PulsePOCChannel {
  check?: PulsePOCCheckFunction;
  setup?: PulsePOCSetupFunction;
}

export class PulsePocPlugin {
  public static getIndexName(channelId: string) {
    return `pulse-poc-raw-${channelId}`;
  }

  private channels = readdirSync(resolve(__dirname, 'channels'))
    .filter(fileName => !fileName.startsWith('.'))
    .map(channelName => {
      const channelPath = resolve(__dirname, 'channels', channelName);
      const checks = readdirSync(channelPath)
        .filter(fileName => fileName.startsWith('check_'))
        .map(fileName => {
          const id = fileName.slice(6, -3);
          const checkFilePath = resolve(channelPath, fileName);
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { check, setup }: PulsePOCChannel = require(checkFilePath);
          return { id, check, setup };
        });
      return {
        id: channelName,
        checks,
      };
    });

  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public async setup(core: CoreSetup) {
    const logger = this.initializerContext.logger.get('pulse-service');
    logger.info(
      `Starting up POC pulse service, which wouldn't actually be part of Kibana in reality`
    );
    const esClient = core.elasticsearch.createClient('xpack-pulse_poc');
    await esClient.callAsInternalUser('indices.putTemplate', {
      name: 'pulse-poc-raw-template',
      body: {
        index_patterns: [PulsePocPlugin.getIndexName('*')],
        settings: {
          number_of_shards: 1,
        },
        mappings: {
          properties: {
            channel_id: { type: 'keyword' },
            deployment_id: { type: 'keyword' },
            timestamp: { type: 'date' },
            // newsfeed specific mapping
            publishOn: { type: 'date' },
          },
        },
      },
    });

    const router = core.http.createRouter();

    router.post(
      {
        path: '/api/pulse_poc/intake/{deploymentId}',
        validate: {
          params: schema.object({
            deploymentId: schema.string(),
          }),
          body: schema.object({
            channels: schema.arrayOf(
              schema.object({
                channel_id: schema.string({
                  validate: value => {
                    if (!this.channels.some(channel => channel.id === value)) {
                      return `'${value}' is not a known channel`;
                    }
                  },
                }),
                records: schema.arrayOf(
                  schema.object(
                    {
                      hash: schema.string(), // TODO: Remove if we add any logic to calculate the hash in the remote channel
                    },
                    { allowUnknowns: true }
                  )
                ),
              })
            ),
          }),
        },
      },
      async (context, request, response) => {
        const { deploymentId } = request.params;
        const { channels } = request.body;
        const es = context.core.elasticsearch.adminClient;

        const body = channels.reduce((acc, { channel_id, records }) => {
          return records.reduce(
            (acc2, record) => [
              ...acc2,
              { update: { _index: PulsePocPlugin.getIndexName(channel_id), _id: record.hash } },
              {
                doc: { ...record, timestamp: new Date(), channel_id, deployment_id: deploymentId },
                doc_as_upsert: true,
              },
            ],
            acc
          );
        }, [] as object[]);

        if (body.length > 0) {
          await es.callAsInternalUser('bulk', { body });
        }

        return response.ok();
      }
    );

    router.get(
      {
        path: '/api/pulse_poc/instructions/{deploymentId}',
        validate: {
          params: schema.object({
            deploymentId: schema.string(),
          }),
        },
      },
      async (context, request, response) => {
        const { deploymentId } = request.params;
        const es = context.core.elasticsearch.adminClient;
        const allChannelCheckResults = this.channels.map(async channel => {
          const indexName = PulsePocPlugin.getIndexName(channel.id);
          const channelChecks = channel.checks.map(
            ({ check }) => check && check(es, { deploymentId, indexName })
          );
          const checkResults = await Promise.all(channelChecks);
          const instructions = checkResults.filter((value: any) => Boolean(value));
          return {
            id: channel.id,
            instructions,
          };
        });
        const channels = await Promise.all(allChannelCheckResults);
        return response.ok({ body: { channels } });
      }
    );

    for (const { id, checks } of this.channels) {
      const index = PulsePocPlugin.getIndexName(id);
      for (const { setup } of checks) {
        await (setup && setup(esClient, index));
      }
    }
  }

  public start() {}

  public stop() {}
}
