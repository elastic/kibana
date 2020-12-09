/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ResolverSchema } from '../../../common/endpoint/types';

/*
 * This file provides simple factory functions which return mock schemas for various data sources such as endpoint and winlogbeat.
 * This information is part of what is returned by the `entities` call in the dataAccessLayer and used in the`resolverTree` api call.
 */

const defaultProcessSchema = {
  id: 'process.entity_id',
  name: 'process.name',
  parent: 'process.parent.entity_id',
};

/* Factory function returning the source and schema for the endpoint data source  */
export function endpointSourceSchema(): { dataSource: string; schema: ResolverSchema } {
  return {
    dataSource: 'endpoint',
    schema: {
      ...defaultProcessSchema,
      ancestry: 'process.Ext.ancestry',
    },
  };
}

/* Factory function returning the source and schema for the winlogbeat data source */
export function winlogSourceSchema(): { dataSource: string; schema: ResolverSchema } {
  return {
    dataSource: 'winlogbeat',
    schema: {
      ...defaultProcessSchema,
    },
  };
}
