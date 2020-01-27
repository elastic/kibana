/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { readdirSync } from 'fs';
import { resolve } from 'path';
import { schema } from '@kbn/config-schema';
import { CoreSetup, PluginInitializerContext } from 'src/core/server';
import { take } from 'rxjs/operators';

export class PulsePocPlugin {
  private channels = readdirSync(resolve(__dirname, 'channels'))
    .filter((fileName: string) => !fileName.startsWith('.'))
    .map((channelName: string) => {
      const channelPath = resolve(__dirname, 'channels', channelName);
      const checks = readdirSync(channelPath)
        .filter((fileName: string) => fileName.startsWith('check_'))
        .map((fileName: string) => {
          const id = fileName.slice(6, -3);
          const checkFilePath = resolve(channelPath, fileName);
          const check = require(checkFilePath).check;
          return { id, check };
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
    const esClient = await core.elasticsearch.adminClient$.pipe(take(1)).toPromise();
    await esClient.callAsInternalUser('indices.putTemplate', {
      name: 'pulse-poc-raw-template',
      body: {
        index_patterns: ['pulse-poc-raw*'],
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
                records: schema.arrayOf(schema.object({}, { allowUnknowns: true })),
              })
            ),
          }),
        },
      },
      async (context, request, response) => {
        const { deploymentId } = request.params;
        const { channels } = request.body;
        const es = context.core.elasticsearch.adminClient;

        for (const channel of channels) {
          const index = `pulse-poc-raw-${channel.channel_id}`;

          for (const record of channel.records) {
            await es.callAsInternalUser('index', {
              index,
              id: record.hash,
              body: {
                ...record,
                timestamp: new Date(),
                channel_id: channel.channel_id,
                deployment_id: deploymentId,
              },
            });
          }
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
          const indexName = `pulse-poc-raw-${channel.id}`;
          const channelChecks = channel.checks.map(check =>
            check.check(es, { deploymentId, indexName })
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
  }

  public start() {}

  public stop() {}
}
