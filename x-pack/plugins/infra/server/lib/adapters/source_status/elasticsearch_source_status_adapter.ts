/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext } from 'src/core/server';
import { InfraSourceStatusAdapter } from '../../source_status';
import { InfraDatabaseGetIndicesResponse } from '../framework';
import { KibanaFramework } from '../framework/kibana_framework_adapter';

export class InfraElasticsearchSourceStatusAdapter implements InfraSourceStatusAdapter {
  constructor(private readonly framework: KibanaFramework) {}

  public async getIndexNames(requestContext: RequestHandlerContext, aliasName: string) {
    const indexMaps = await Promise.all([
      this.framework
        .callWithRequest(requestContext, 'indices.getAlias', {
          name: aliasName,
          filterPath: '*.settings.index.uuid', // to keep the response size as small as possible
        })
        .catch(withDefaultIfNotFound<InfraDatabaseGetIndicesResponse>({})),
      this.framework
        .callWithRequest(requestContext, 'indices.get', {
          index: aliasName,
          filterPath: '*.settings.index.uuid', // to keep the response size as small as possible
        })
        .catch(withDefaultIfNotFound<InfraDatabaseGetIndicesResponse>({})),
    ]);

    return indexMaps.reduce(
      (indexNames, indexMap) => [...indexNames, ...Object.keys(indexMap)],
      [] as string[]
    );
  }

  public async hasAlias(requestContext: RequestHandlerContext, aliasName: string) {
    return await this.framework.callWithRequest(requestContext, 'indices.existsAlias', {
      name: aliasName,
    });
  }

  public async hasIndices(requestContext: RequestHandlerContext, indexNames: string) {
    return await this.framework
      .callWithRequest(requestContext, 'search', {
        ignore_unavailable: true,
        allow_no_indices: true,
        index: indexNames,
        size: 0,
        terminate_after: 1,
      })
      .then(
        response => response._shards.total > 0,
        err => {
          if (err.status === 404) {
            return false;
          }
          throw err;
        }
      );
  }
}

const withDefaultIfNotFound = <DefaultValue>(defaultValue: DefaultValue) => (
  error: any
): DefaultValue => {
  if (error && error.status === 404) {
    return defaultValue;
  }
  throw error;
};
