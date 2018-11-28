/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DatabaseGetIndicesResponse, FrameworkAdapter, FrameworkRequest } from '../framework';
import { SourceStatusAdapter } from './index';

export class ElasticsearchSourceStatusAdapter implements SourceStatusAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async getIndexNames(request: FrameworkRequest, aliasName: string) {
    const indexMaps = await Promise.all([
      this.framework
        .callWithRequest(request, 'indices.getAlias', {
          name: aliasName,
          filterPath: '*.settings.index.uuid', // to keep the response size as small as possible
        })
        .catch(withDefaultIfNotFound<DatabaseGetIndicesResponse>({})),
      this.framework
        .callWithRequest(request, 'indices.get', {
          index: aliasName,
          filterPath: '*.settings.index.uuid', // to keep the response size as small as possible
        })
        .catch(withDefaultIfNotFound<DatabaseGetIndicesResponse>({})),
    ]);
    return indexMaps.reduce(
      (indexNames, indexMap) => [...indexNames, ...Object.keys(indexMap)],
      [] as string[]
    );
  }

  public async hasAlias(request: FrameworkRequest, aliasName: string) {
    return await this.framework.callWithRequest(request, 'indices.existsAlias', {
      name: aliasName,
    });
  }

  public async hasIndices(request: FrameworkRequest, indexNames: string) {
    return (await this.getIndexNames(request, indexNames)).length > 0;
  }
}

const withDefaultIfNotFound = <DefaultValue>(defaultValue: DefaultValue) => (
  // tslint:disable-next-line:no-any
  error: any
): DefaultValue => {
  if (error && error.status === 404) {
    return defaultValue;
  }
  throw error;
};
