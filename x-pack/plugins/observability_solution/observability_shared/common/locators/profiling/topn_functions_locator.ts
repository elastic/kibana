/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import qs from 'query-string';
import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';

export interface TopNFunctionsLocatorParams extends SerializableRecord {
  kuery?: string;
  rangeFrom?: string;
  rangeTo?: string;
}

export type TopNFunctionsLocator = LocatorPublic<TopNFunctionsLocatorParams>;

export class TopNFunctionsLocatorDefinition
  implements LocatorDefinition<TopNFunctionsLocatorParams>
{
  public readonly id = 'topNFunctionsLocator';

  public readonly getLocation = async ({
    rangeFrom,
    rangeTo,
    kuery,
  }: TopNFunctionsLocatorParams) => {
    const params = { rangeFrom, rangeTo, kuery };
    return {
      app: 'profiling',
      path: `/functions/topn?${qs.stringify(params)}`,
      state: {},
    };
  };
}
