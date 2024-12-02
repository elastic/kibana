/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityDefinition, entityDefinitionSchema } from '@kbn/entities-schema';
import { BUILT_IN_ID_PREFIX } from '../../constants';
import { commonOtelIndexPatterns } from '../common/otel_index_patterns';
import { commonOtelMetadata } from '../common/otel_metadata';

export const builtInKubernetesDaemonSetSemConvEntityDefinition: EntityDefinition =
  entityDefinitionSchema.parse({
    id: `${BUILT_IN_ID_PREFIX}kubernetes_daemon_set_semconv`,
    filter: 'k8s.daemonset.uid : *',
    managed: true,
    version: '0.1.0',
    name: 'Kubernetes DaemonSet from SemConv data',
    description:
      'This definition extracts Kubernetes daemon set entities using data collected with OpenTelemetry',
    type: 'k8s.daemonset.otel',
    indexPatterns: commonOtelIndexPatterns,
    identityFields: ['k8s.daemonset.uid'],
    displayNameTemplate: '{{k8s.daemonset.name}}',
    latest: {
      timestampField: '@timestamp',
      lookbackPeriod: '10m',
      settings: {
        frequency: '5m',
      },
    },
    metadata: [
      ...commonOtelMetadata,
      {
        source: 'k8s.daemonset.name',
        destination: 'k8s.daemonset.name',
        aggregation: { type: 'top_value', sort: { '@timestamp': 'desc' } },
      },
    ],
  });
