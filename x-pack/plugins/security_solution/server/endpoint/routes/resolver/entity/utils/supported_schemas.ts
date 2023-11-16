/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import type { ResolverSchema } from '../../../../../../common/endpoint/types';

interface SupportedSchema {
  /**
   * A name for the schema being used
   */
  name: string;

  /**
   * A constraint to search for in the documented returned by Elasticsearch
   */
  constraints: Array<{ field: string; value: string }>;

  /**
   * Schema to return to the frontend so that it can be passed in to call to the /tree API
   */
  schema: ResolverSchema;
}

/**
 * This structure defines the preset supported schemas for a resolver graph. We'll probably want convert this
 * implementation to something similar to how row renderers is implemented.
 */
export const supportedSchemas: SupportedSchema[] = [
  {
    name: 'endpoint',
    constraints: [
      {
        field: 'agent.type',
        value: 'endpoint',
      },
    ],
    schema: {
      id: 'process.entity_id',
      parent: 'process.parent.entity_id',
      ancestry: 'process.Ext.ancestry',
      name: 'process.name',
    },
  },
  {
    name: 'winlogbeat',
    constraints: [
      {
        field: 'agent.type',
        value: 'winlogbeat',
      },
      {
        field: 'event.module',
        value: 'sysmon',
      },
    ],
    schema: {
      id: 'process.entity_id',
      parent: 'process.parent.entity_id',
      name: 'process.name',
    },
  },
  {
    name: 'osquerybeat',
    constraints: [
      {
        field: 'agent.type',
        value: 'osquerybeat',
      },
      {
        field: 'event.module',
        value: 'osquery_manager',
      },
    ],
    schema: {
      id: 'osquery.entity_id',
      parent: 'osquery.ancestry.entity_id',
      name: 'osquery.name',
    },
  },
  {
    name: 'sentinel_one_cloud_funnel',
    constraints: [
      {
        field: 'agent.type',
        value: 'filebeat',
      },
      {
        field: 'event.dataset',
        value: 'sentinel_one_cloud_funnel.event',
      },
    ],
    schema: {
      // could be changed to [below value] if we get the tgt values to become a separate document
      id: 'sentinel_one_cloud_funnel.event.tgt.process.uid', // sentinel_one_cloud_funnel.event.src.process.uid
      parent: 'sentinel_one_cloud_funnel.event.src.process.uid', // sentinel_one_cloud_funnel.event.src.process.parent.uid
      name: 'sentinel_one_cloud_funnel.event.tgt.process.name', // sentinel_one_cloud_funnel.event.src.process.name
    },
  },
  {
    name: 'sentinel_one',
    constraints: [
      {
        field: 'agent.type',
        value: 'filebeat',
      },
      {
        field: 'event.dataset',
        value: 'sentinel_one.alert',
      },
    ],
    schema: {
      id: 'process.entity_id',
      parent: 'process.parent.entity_id',
      name: 'process.name',
    },
  },
  {
    name: 'sysmonViaFilebeat',
    constraints: [
      {
        field: 'agent.type',
        value: 'filebeat',
      },
      {
        field: 'event.dataset',
        value: 'windows.sysmon_operational',
      },
    ],
    schema: {
      id: 'process.entity_id',
      parent: 'process.parent.entity_id',
      name: 'process.name',
    },
  },
];

export function getFieldAsString(doc: unknown, field: string): string | undefined {
  const value = _.get(doc, field);
  if (value === undefined) {
    return undefined;
  }

  return String(value);
}
