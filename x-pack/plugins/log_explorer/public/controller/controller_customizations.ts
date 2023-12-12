/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { FlyoutContentProps as DiscoverFlyoutContentProps } from '@kbn/discover-plugin/public';
import type { DataTableRecord } from '@kbn/discover-utils/types';

export interface LogExplorerCustomizations {
  flyout?: {
    renderContent?: RenderContentCustomization<LogExplorerFlyoutContentProps>;
  };
}

export interface LogExplorerFlyoutContentProps extends DiscoverFlyoutContentProps {
  dataView: DataView;
  doc: LogDocument;
}

export interface LogDocument extends DataTableRecord {
  flattened: {
    '@timestamp': string;
    'log.level'?: [string];
    message?: [string];

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

export type RenderContentCustomization<Props> = (
  renderPreviousContent: RenderPreviousContent<Props>
) => (props: Props) => React.ReactNode;

export type RenderPreviousContent<Props> = (props: Props) => React.ReactNode;
