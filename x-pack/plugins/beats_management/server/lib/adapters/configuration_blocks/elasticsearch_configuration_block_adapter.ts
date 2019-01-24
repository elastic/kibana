/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten, get } from 'lodash';
import uuidv4 from 'uuid/v4';
import { INDEX_NAMES } from '../../../../common/constants';
import { ConfigurationBlock } from '../../../../common/domain_types';
import { DatabaseAdapter } from '../database/adapter_types';
import { FrameworkUser } from '../framework/adapter_types';
import { ConfigurationBlockAdapter } from './adapter_types';

export class ElasticsearchConfigurationBlockAdapter implements ConfigurationBlockAdapter {
  private database: DatabaseAdapter;

  constructor(database: DatabaseAdapter) {
    this.database = database;
  }

  public async getByIds(user: FrameworkUser, ids: string[]): Promise<ConfigurationBlock[]> {
    if (ids.length === 0) {
      return [];
    }

    const params = {
      ignore: [404],
      _source: true,
      size: 10000,
      index: INDEX_NAMES.BEATS,
      type: '_doc',
      body: {
        ids: ids.map(id => `configuration_block:${id}`),
      },
    };

    const response = await this.database.search(user, params);
    const configs = get<any>(response, 'hits.hits', []);

    return configs.map((tag: any) => ({ ...tag._source.tag, config: JSON.parse(tag._source.tag) }));
  }

  public async getForTags(
    user: FrameworkUser,
    tagIds: string[],
    page: number = 0,
    size: number = 100
  ): Promise<{ blocks: ConfigurationBlock[]; page: number; total: number }> {
    if (tagIds.length === 0) {
      return {
        page: 0,
        total: 0,
        blocks: [] as ConfigurationBlock[],
      };
    }

    const params = {
      ignore: [404],
      index: INDEX_NAMES.BEATS,
      type: '_doc',
      body: {
        from: page === -1 ? undefined : page * size,
        size,
        query: {
          terms: { 'configuration_block.tag': tagIds },
        },
      },
    };
    let response;
    if (page === -1) {
      response = await this.database.searchAll(user, params);
    } else {
      response = await this.database.search(user, params);
    }
    const configs = get<any>(response, 'hits.hits', []);

    return {
      blocks: configs.map((block: any) => ({
        ...block._source.configuration_block,
        config: JSON.parse(block._source.configuration_block.config || '{}'),
      })),
      page,
      total: (response.hits.total as any).value,
    };
  }

  public async delete(
    user: FrameworkUser,
    ids: string[]
  ): Promise<Array<{ id: string; success: boolean; reason?: string }>> {
    const result = await this.database.bulk(user, {
      body: ids.map(id => ({ delete: { _id: `configuration_block:${id}` } })),
      index: INDEX_NAMES.BEATS,
      refresh: 'wait_for',
      type: '_doc',
    });

    if (result.errors) {
      if (result.items[0].result) {
        throw new Error(result.items[0].result);
      }
      throw new Error((result.items[0] as any).index.error.reason);
    }

    return result.items.map((item: any) => {
      return {
        id: item.delete._id,
        success: item.delete.result === 'deleted',
        reason: item.delete.result !== 'deleted' ? item.delete.result : undefined,
      };
    });
  }

  public async create(user: FrameworkUser, configs: ConfigurationBlock[]): Promise<string[]> {
    const body = flatten(
      configs.map(config => {
        const id = uuidv4();
        return [
          { index: { _id: `configuration_block:${id}` } },
          {
            type: 'configuration_block',
            configuration_block: { id, ...config, config: JSON.stringify(config.config) },
          },
        ];
      })
    );

    const result = await this.database.bulk(user, {
      body,
      index: INDEX_NAMES.BEATS,
      refresh: 'wait_for',
      type: '_doc',
    });

    if (result.errors) {
      if (result.items[0].result) {
        throw new Error(result.items[0].result);
      }
      throw new Error((result.items[0] as any).index.error.reason);
    }

    return result.items.map((item: any) => item.index._id);
  }

  public async getTagIdsExcludingTypes(
    user: FrameworkUser,
    blockTypes: string[]
  ): Promise<string[]> {
    const body = {
      query: {
        bool: {
          must_not: {
            terms: { type: blockTypes },
          },
        },
      },
      aggs: {
        tags: {
          terms: { field: 'configuration_block.tag' },
        },
      },
    };

    const params = {
      body,
      index: INDEX_NAMES.BEATS,
      ignore: [404],
      _source: true,
      size: 10000,
      type: '_doc',
    };
    const response = await this.database.search(user, params);

    // @ts-ignore
    return get<any>(response, 'aggregations.tags.buckets', []).map(bucket => bucket.key);
  }
}
