/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ElasticsearchClient, Logger } from '@kbn/core/server';

import {
  Collector,
  collectContainers,
  collectHosts,
  collectPods,
  collectServices,
} from './collectors';
import { Asset } from '../../../common/types_api';

interface ImplicitCollectionOptions {
  inputClient: ElasticsearchClient;
  outputClient: ElasticsearchClient;
  intervalMs: number;
  logger: Logger;
}

export function runImplicitCollection(options: ImplicitCollectionOptions): NodeJS.Timeout {
  const runner = new CollectorRunner(options);
  runner.registerCollector('containers', collectContainers);
  runner.registerCollector('hosts', collectHosts);
  runner.registerCollector('pods', collectPods);
  runner.registerCollector('services', collectServices);

  return setInterval(async () => {
    options.logger.info('Starting execution');
    await runner.run();
    options.logger.info('Execution ended');
  }, options.intervalMs);
}

class CollectorRunner {
  private collectors: Array<{ name: string; collector: Collector }> = [];

  constructor(private options: ImplicitCollectionOptions) {}

  registerCollector(name: string, collector: Collector) {
    this.collectors.push({ name, collector });
  }

  async run() {
    const collectorOptions = {
      client: this.options.inputClient,
      from: Date.now() - this.options.intervalMs,
    };

    for (let i = 0; i < this.collectors.length; i++) {
      const { name, collector } = this.collectors[i];
      this.options.logger.info(`Collector '${name}' started`);

      const assets = await collector(collectorOptions)
        .then((collectedAssets) => {
          this.options.logger.info(`Collector '${name}' found ${collectedAssets.length} assets`);
          return collectedAssets;
        })
        .catch((err) => {
          this.options.logger.error(`Collector '${name}' execution failure: ${err}`);
          return [];
        });

      if (assets.length) {
        const bulkBody = assets.flatMap((asset: Asset) => {
          return [{ create: { _index: `assets-${asset['asset.kind']}-default` } }, asset];
        });

        await this.options.outputClient
          .bulk({ body: bulkBody })
          .then((res) => {
            if (res.errors) {
              this.options.logger.error(
                `Failure writing assets documents from collector '${name}': ${JSON.stringify(res)}`
              );
            }
          })
          .catch((err) => {
            this.options.logger.error(
              `Failure writing assets documents from collector '${name}': ${err}`
            );
          });
      }
    }
  }
}
