/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ApmPluginStartDeps } from '../../../../plugin';
import { getLensAttributes } from './get_lens_attributes';

export enum MostUsedMetric {
  DEVICE_NAME = 'device.model.name',
  NCT = 'network.connection.type',
  APP_VERSION = 'agent.version',
  OS_VERSION = 'host.os.version',
}

export function MostUsedChart({
  start,
  end,
  filters,
  metric,
  bucketSize = 5,
}: {
  start: string;
  end: string;
  filters: QueryDslQueryContainer[];
  metric: MostUsedMetric;
  bucketSize?: number;
}) {
  const { services } = useKibana<ApmPluginStartDeps>();
  const {
    lens: { EmbeddableComponent },
  } = services;

  const lensAttributes = useMemo(
    () =>
      getLensAttributes({
        filters,
        metric,
        bucketSize,
      }),
    [filters, metric, bucketSize]
  );

  return (
    <EmbeddableComponent
      viewMode={ViewMode.VIEW}
      id={`most-used-${metric.replaceAll('.', '-')}`}
      hidePanelTitles
      withDefaultActions
      style={{ height: 200 }}
      attributes={lensAttributes}
      timeRange={{
        from: start,
        to: end,
      }}
    />
  );
}
