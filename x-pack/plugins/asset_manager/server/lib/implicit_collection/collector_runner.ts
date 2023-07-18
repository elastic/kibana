/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';
import { ImplicitCollectionOptions } from '.';
import { Collector, CollectorOptions, QUERY_MAX_SIZE } from '../collectors';
import { Asset } from '../../../common/types_api';
import { withSpan } from '../collectors/helpers';

const TRANSACTION_TYPE = 'asset_manager-implicit_collection';
const transactionName = (collectorName: string) => `asset_manager-collector_${collectorName}`;

export class CollectorRunner {
  private collectors: Array<{ name: string; collector: Collector }> = [];

  constructor(private options: ImplicitCollectionOptions) {}

  registerCollector(name: string, collector: Collector) {
    this.collectors.push({ name, collector });
  }

  async run() {
    const to = Date.now();
    const from = to - this.options.intervalMs;

    for (let i = 0; i < this.collectors.length; i++) {
      const { name, collector } = this.collectors[i];
      this.options.logger.info(`Collector '${name}' started`);

      const transaction = apm.startTransaction(transactionName(name), TRANSACTION_TYPE);
      const collectorOptions: CollectorOptions = {
        from: new Date(from).toISOString(),
        to: new Date(to).toISOString(),
        client: this.options.inputClient,
        transaction,
        sourceIndices: this.options.sourceIndices,
      };

      let totalAssets = 0;
      do {
        const collectorResult = await withSpan({ name: 'read', transaction }, () =>
          collector(collectorOptions as any as CollectorOptions).catch((err) => {
            this.options.logger.error(`Collector '${name}' execution failure: ${err}`);
            return { assets: [], afterKey: undefined };
          })
        );

        collectorOptions.afterKey = collectorResult.afterKey;

        if (collectorResult.assets.length) {
          totalAssets += collectorResult.assets.length;
          const bulkBody = collectorResult.assets.flatMap((asset: Asset) => {
            return [{ create: { _index: `assets-${asset['asset.kind']}-default` } }, asset];
          });

          await withSpan({ name: 'write', transaction }, () =>
            this.options.outputClient
              .bulk({ body: bulkBody })
              .then((res) => {
                if (res.errors) {
                  this.options.logger.error(
                    `Failure writing assets documents from collector '${name}': ${JSON.stringify(
                      res
                    )}`
                  );
                }
              })
              .catch((err) => {
                this.options.logger.error(
                  `Failure writing assets documents from collector '${name}': ${err}`
                );
              })
          );
        }
      } while (collectorOptions.afterKey);

      transaction?.addLabels({
        assets_count: totalAssets,
        interval_ms: this.options.intervalMs,
        page_size: QUERY_MAX_SIZE,
      });

      transaction?.end();
    }
  }
}
