/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { CollectorRunner } from './collector_runner';
import { CollectorOptions } from '../collectors';
import { Asset } from '../../../common/types_api';
import { INDEX_DEFAULTS } from '../../types';

const getMockClient = () => ({
  bulk: jest.fn().mockResolvedValue({ errors: false }),
});

const getMockLogger = () =>
  ({
    info: jest.fn(),
    error: jest.fn(),
  } as unknown as Logger);

describe(__filename, () => {
  it('runs registered collectors', async () => {
    const runner = new CollectorRunner({
      inputClient: getMockClient() as unknown as ElasticsearchClient,
      outputClient: getMockClient() as unknown as ElasticsearchClient,
      logger: getMockLogger(),
      intervalMs: 1,
      sourceIndices: INDEX_DEFAULTS,
    });

    const collector1 = jest.fn(async (opts: CollectorOptions) => {
      return { assets: [] };
    });
    const collector2 = jest.fn(async (opts: CollectorOptions) => {
      return { assets: [] };
    });

    runner.registerCollector('foo', collector1);
    runner.registerCollector('foo', collector2);

    await runner.run();

    expect(collector1.mock.calls).to.have.length(1);
    expect(collector2.mock.calls).to.have.length(1);
  });

  it('is resilient to failing collectors', async () => {
    const runner = new CollectorRunner({
      outputClient: getMockClient() as unknown as ElasticsearchClient,
      inputClient: getMockClient() as unknown as ElasticsearchClient,
      logger: getMockLogger(),
      intervalMs: 1,
      sourceIndices: INDEX_DEFAULTS,
    });

    const collector1 = jest.fn(async (opts: CollectorOptions) => {
      throw new Error('no');
    });
    const collector2 = jest.fn(async (opts: CollectorOptions) => {
      return { assets: [] };
    });

    runner.registerCollector('foo', collector1);
    runner.registerCollector('foo', collector2);

    await runner.run();

    expect(collector1.mock.calls).to.have.length(1);
    expect(collector2.mock.calls).to.have.length(1);
  });

  it('stores collectors results in elasticsearch', async () => {
    const outputClient = getMockClient();
    const runner = new CollectorRunner({
      outputClient: outputClient as unknown as ElasticsearchClient,
      inputClient: getMockClient() as unknown as ElasticsearchClient,
      logger: getMockLogger(),
      intervalMs: 1,
      sourceIndices: INDEX_DEFAULTS,
    });

    const collector = jest.fn(async (opts: CollectorOptions) => {
      return {
        assets: [
          { 'asset.kind': 'container', 'asset.ean': 'foo' },
          { 'asset.kind': 'pod', 'asset.ean': 'bar' },
        ] as Asset[],
      };
    });

    runner.registerCollector('foo', collector);

    await runner.run();

    expect(outputClient.bulk.mock.calls[0][0]).to.eql({
      body: [
        { create: { _index: 'assets-container-default' } },
        { 'asset.kind': 'container', 'asset.ean': 'foo' },
        { create: { _index: 'assets-pod-default' } },
        { 'asset.kind': 'pod', 'asset.ean': 'bar' },
      ],
    });
  });

  it('handles multi-pages collectors', async () => {
    const runner = new CollectorRunner({
      outputClient: getMockClient() as unknown as ElasticsearchClient,
      inputClient: getMockClient() as unknown as ElasticsearchClient,
      logger: getMockLogger(),
      intervalMs: 1,
      sourceIndices: INDEX_DEFAULTS,
    });

    const collector = jest
      .fn()
      .mockResolvedValueOnce({
        assets: [{ 'asset.kind': 'host', 'asset.ean': 'one' }],
        afterKey: ['one'],
      })
      .mockResolvedValueOnce({
        assets: [{ 'asset.kind': 'host', 'asset.ean': 'two' }],
        afterKey: ['two'],
      })
      .mockResolvedValueOnce({ assets: [{ 'asset.kind': 'host', 'asset.ean': 'three' }] });

    runner.registerCollector('foo', collector);

    await runner.run();

    expect(collector.mock.calls).to.have.length(3);
  });

  it('passes page cursor to collectors', async () => {
    const runner = new CollectorRunner({
      outputClient: getMockClient() as unknown as ElasticsearchClient,
      inputClient: getMockClient() as unknown as ElasticsearchClient,
      logger: getMockLogger(),
      intervalMs: 1,
      sourceIndices: INDEX_DEFAULTS,
    });

    const collector = jest
      .fn()
      .mockImplementationOnce(async (options) => {
        expect(options.afterKey).to.eql(undefined);
        return {
          assets: [{ 'asset.kind': 'host', 'asset.ean': 'one' }],
          afterKey: ['one'],
        };
      })
      .mockImplementationOnce(async (options) => {
        expect(options.afterKey).to.eql(['one']);
        return {
          assets: [{ 'asset.kind': 'host', 'asset.ean': 'two' }],
          afterKey: ['two'],
        };
      })
      .mockImplementationOnce(async (options) => {
        expect(options.afterKey).to.eql(['two']);
        return {
          assets: [{ 'asset.kind': 'host', 'asset.ean': 'three' }],
        };
      });

    runner.registerCollector('foo', collector);

    await runner.run();

    expect(collector.mock.calls).to.have.length(3);
  });
});
