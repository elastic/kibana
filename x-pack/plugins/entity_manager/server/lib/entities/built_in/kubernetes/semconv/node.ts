/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition, entityDefinitionSchema } from '@kbn/entities-schema';
import { BUILT_IN_ID_PREFIX } from '../../constants';

export const builtInKubernetesNodeSemConvEntityDefinition: EntityDefinition =
  entityDefinitionSchema.parse({
    id: `${BUILT_IN_ID_PREFIX}kubernetes_node_semconv`,
    managed: true,
    version: '0.1.0',
    name: 'Kubernetes Node from SemConv data',
    description:
      'This definition extracts Kubernetes node entities using data collected with OpenTelemetry',
    type: 'kubernetes_node_semconv',
    indexPatterns: ['metrics-kubernetes*'],
    identityFields: ['k8s.node.uid'],
    displayNameTemplate: '{{k8s.node.uid}}',
    latest: {
      timestampField: '@timestamp',
      lookbackPeriod: '10m',
      settings: {
        frequency: '5m',
      },
    },
    metadata: [
      {
        source: '_index',
        destination: 'source_index',
      },
      {
        source: 'data_stream.type',
        destination: 'source_data_stream.type',
      },
      {
        source: 'data_stream.dataset',
        destination: 'source_data_stream.dataset',
      },
      'cloud.availability_zone',
      'k8s.cluster.name',
    ],
  });
