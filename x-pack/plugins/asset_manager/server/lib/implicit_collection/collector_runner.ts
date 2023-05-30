/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';

import { ImplicitCollectionOptions } from '.';
import { Collector, QUERY_MAX_SIZE } from './collectors';
import { Asset } from '../../../common/types_api';

const TRANSACTION_TYPE = 'asset_manager-implicit_collection';
const transactionName = (collectorName: string) => `asset_manager-collector_${collectorName}`;

export class CollectorRunner {
  private collectors: Array<{ name: string; collector: Collector }> = [];

  constructor(private options: ImplicitCollectionOptions) {}

  registerCollector(name: string, collector: Collector) {
    this.collectors.push({ name, collector });
  }

  async run() {
    const now = Date.now();

    for (let i = 0; i < this.collectors.length; i++) {
      const { name, collector } = this.collectors[i];
      this.options.logger.info(`Collector '${name}' started`);

      const transaction = apm.startTransaction(transactionName(name), TRANSACTION_TYPE);
      const collectorOptions = {
        from: now - this.options.intervalMs,
        client: this.options.inputClient,
        transaction,
      };

      const assets = await collector(collectorOptions)
        .then((collectedAssets) => {
          this.options.logger.info(`Collector '${name}' found ${collectedAssets.length} assets`);
          return collectedAssets;
        })
        .catch((err) => {
          this.options.logger.error(`Collector '${name}' execution failure: ${err}`);
          return [];
        });

      transaction?.addLabels({
        assets_count: assets.length,
        interval_ms: this.options.intervalMs,
        page_size: QUERY_MAX_SIZE,
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

      transaction?.end();
    }
  }
}
