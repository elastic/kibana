/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InfraPluginRequestHandlerContext } from '../../../types';
import { InfraSourceStatusAdapter, SourceIndexStatus } from '../../source_status';
import { InfraDatabaseGetIndicesResponse } from '../framework';
import { KibanaFramework } from '../framework/kibana_framework_adapter';

export class InfraElasticsearchSourceStatusAdapter implements InfraSourceStatusAdapter {
  constructor(private readonly framework: KibanaFramework) {}

  public async getIndexNames(requestContext: InfraPluginRequestHandlerContext, aliasName: string) {
    const indexMaps = await Promise.all([
      this.framework
        .callWithRequest(requestContext, 'indices.getAlias', {
          name: aliasName,
          filter_path: '*.settings.index.uuid', // to keep the response size as small as possible
        })
        .catch(withDefaultIfNotFound<InfraDatabaseGetIndicesResponse>({})),
      this.framework
        .callWithRequest(requestContext, 'indices.get', {
          index: aliasName,
          filter_path: '*.settings.index.uuid', // to keep the response size as small as possible
        })
        .catch(withDefaultIfNotFound<InfraDatabaseGetIndicesResponse>({})),
    ]);

    return indexMaps.reduce(
      (indexNames, indexMap) => [...indexNames, ...Object.keys(indexMap)],
      [] as string[]
    );
  }

  public async hasAlias(requestContext: InfraPluginRequestHandlerContext, aliasName: string) {
    return await this.framework.callWithRequest(requestContext, 'indices.existsAlias', {
      name: aliasName,
    });
  }

  public async getIndexStatus(
    requestContext: InfraPluginRequestHandlerContext,
    indexNames: string
  ): Promise<SourceIndexStatus> {
    return await this.framework
      .callWithRequest(requestContext, 'search', {
        ignore_unavailable: true,
        allow_no_indices: true,
        index: indexNames,
        size: 0,
        terminate_after: 1,
        track_total_hits: 1,
      })
      .then(
        (response) => {
          if (response._shards.total <= 0) {
            return 'missing';
          }

          if (response.hits.total.value > 0) {
            return 'available';
          }

          return 'empty';
        },
        (err) => {
          if (err.status === 404) {
            return 'missing';
          }
          throw err;
        }
      );
  }
}

const withDefaultIfNotFound =
  <DefaultValue>(defaultValue: DefaultValue) =>
  (error: any): DefaultValue => {
    if (error && error.status === 404) {
      return defaultValue;
    }
    throw error;
  };
