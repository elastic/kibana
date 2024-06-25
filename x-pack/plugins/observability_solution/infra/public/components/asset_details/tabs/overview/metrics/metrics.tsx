/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import type { TimeRange } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
import { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { HostMetrics } from './host_metrics';
import { ContainerMetrics } from './container_metrics';
import { Section } from '../../../components/section';
import { MetricsSectionTitle } from '../section_titles';

interface Props {
  assetId: string;
  assetType: InventoryItemType;
  dateRange: TimeRange;
  dataView?: DataView;
}

export const MetricsContent = ({ assetType, ...props }: Props) => {
  const content = useMemo(() => {
    switch (assetType) {
      case 'host':
        return <HostMetrics {...props} />;
      case 'container':
        return <ContainerMetrics {...props} />;
      default:
        return null;
    }
  }, [assetType, props]);

  return (
    <Section
      title={<MetricsSectionTitle assetType={assetType} />}
      data-test-subj="infraAssetDetailsMetricsCollapsible"
      id="metrics"
      collapsible
    >
      {content}
    </Section>
  );
};
