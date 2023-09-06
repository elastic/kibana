/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { EuiFlexItem, EuiTitle, EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { HostMetricsExplanationContent } from '../../../../lens';
import { Popover } from '../../common/popover';

const SectionTitle = ({ title }: { title: string }) => {
  return (
    <EuiTitle size="xxs">
      <span>{title}</span>
    </EuiTitle>
  );
};

export const MetricsSectionTitle = () => {
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center">
      <EuiFlexItem grow={false}>
        <SectionTitle
          title={i18n.translate('xpack.infra.assetDetails.overview.metricsSectionTitle', {
            defaultMessage: 'Metrics',
          })}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <Popover icon="iInCircle" data-test-subj="infraAssetDetailsMetricsPopoverButton">
          <HostMetricsExplanationContent />
        </Popover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const NginxMetricsSectionTitle = () => (
  <SectionTitle
    title={i18n.translate('xpack.infra.assetDetails.overview.nginxMetricsSectionTitle', {
      defaultMessage: 'Nginx Metric',
    })}
  />
);
