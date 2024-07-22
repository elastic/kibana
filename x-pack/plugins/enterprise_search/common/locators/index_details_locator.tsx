/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LocatorDefinition } from '@kbn/share-plugin/common';
import { SerializableRecord } from '@kbn/utility-types';

import { ENTERPRISE_SEARCH_CONTENT_PLUGIN } from '../constants';

export interface IndexDetailsLocatorParams extends SerializableRecord {
  indexId: string;
}

export class IndexDetailsLocatorDefinition implements LocatorDefinition<IndexDetailsLocatorParams> {
  public readonly getLocation = async (params: IndexDetailsLocatorParams) => {
    return {
      app: ENTERPRISE_SEARCH_CONTENT_PLUGIN.ID,
      path: `/search_indices/${params.indexId}`,
      state: {},
    };
  };
  public readonly id = 'INDEX_DETAILS_LOCATOR_ID';
}
