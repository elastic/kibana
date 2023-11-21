/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { FlyoutContentProps } from '@kbn/discover-plugin/public';
import type { DataTableRecord } from '@kbn/discover-utils/types';

export interface FlyoutProps extends FlyoutContentProps {
  dataView: DataView;
}

export interface LogDocument extends DataTableRecord {
  flattened: {
    '@timestamp': string;
    'log.level'?: string;
    message?: string;

    'host.name'?: string;
    'service.name'?: string;
    'trace.id'?: string;
    'agent.name'?: string;
    'orchestrator.cluster.name'?: string;
    'orchestrator.resource.id'?: string;
    'cloud.provider'?: string;
    'cloud.region'?: string;
    'cloud.availability_zone'?: string;
    'cloud.project.id'?: string;
    'cloud.instance.id'?: string;
    'log.file.path'?: string;
    'data_stream.namespace': string;
    'data_stream.dataset': string;
  };
}

export interface FlyoutDoc {
  '@timestamp': string;
  'log.level'?: string;
  message?: string;

  'host.name'?: string;
  'service.name'?: string;
  'trace.id'?: string;
  'agent.name'?: string;
  'orchestrator.cluster.name'?: string;
  'orchestrator.resource.id'?: string;
  'cloud.provider'?: string;
  'cloud.region'?: string;
  'cloud.availability_zone'?: string;
  'cloud.project.id'?: string;
  'cloud.instance.id'?: string;
  'log.file.path'?: string;
  'data_stream.namespace': string;
  'data_stream.dataset': string;
}
