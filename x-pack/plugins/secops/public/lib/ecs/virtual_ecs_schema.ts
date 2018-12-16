/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EcsSchema } from './ecs_schema';
import { rawEcsSchema } from './raw_ecs_schema';

/**
 * A map of `EcsNamespace.name` `->` `EcsNamespace`
 * This instance includes "virtual (non-spec)" ECS fields e.g `_id` in addition
 * to the fields in the schema exported from https://github.com/elastic/ecs
 *
 * - NOTE: This instance does NOT include "mappings" from ECS fields, to `ECS`
 *   instances e.g. `@timestamp` to `timestamp`
 */
export const virtualEcsSchema: EcsSchema = {
  ...rawEcsSchema,
  base: {
    ...rawEcsSchema.base,
    fields: {
      ...rawEcsSchema.base.fields,
      _id: {
        description: 'NON-ECS field: Each document has an _id that uniquely identifies it',
        example: 'Y-6TfmcB0WOhS6qyMv3s',
        footnote: '',
        group: 1,
        level: 'core',
        name: '_id',
        required: true,
        type: 'keyword',
      },
    },
  },
  suricata: {
    description: 'NON-ECS fields: Suricata event details',
    fields: {
      'suricata.eve.flow_id': {
        description: 'NON-ECS field: Uniquely identifies a flow in Suricata',
        example: '1598126174204751',
        footnote: '',
        group: 1,
        level: 'core',
        name: 'suricata.eve.flow_id',
        required: false,
        type: 'long',
      },
      'suricata.eve.proto': {
        description: 'NON-ECS field: The protocol described by the Suricata event',
        example: 'TCP',
        footnote: '',
        group: 1,
        level: 'core',
        name: 'suricata.eve.proto',
        required: false,
        type: 'keyword',
      },
      'suricata.eve.alert.signature': {
        description: 'NON-ECS field: Alert message text',
        example: 'ET SCAN Possible Nmap User-Agent Observed',
        footnote: '',
        group: 1,
        level: 'core',
        name: 'suricata.eve.alert.signature',
        required: false,
        type: 'keyword',
      },
      'suricata.eve.alert.signature_id': {
        description: 'NON-ECS field: Uniquely identifies an alert in Suricata',
        example: '2024364',
        footnote: '',
        group: 1,
        level: 'core',
        name: 'suricata.eve.alert.signature_id',
        required: false,
        type: 'long',
      },
    },
    group: 1,
    name: 'suricata',
    title: 'Suricata',
    type: 'group',
  },
};
