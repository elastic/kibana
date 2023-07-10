/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { InventoryItemType } from '../../../../../common/inventory_models/types';
import { findInventoryModel } from '../../../../../common/inventory_models';
import type { MetricsTimeInput } from '../../../../pages/metrics/metric_detail/hooks/use_metrics_time';
import { useMetadata } from '../../hooks/use_metadata';
import { useSourceContext } from '../../../../containers/metrics_source';
import { MetadataSummary } from './metadata_summary';
import { KPIGrid } from './kpis/kpi_grid';
import type { StringDateRange } from '../../types';
import { MetricsGrid } from './metrics/metrics_grid';

export interface MetadataSearchUrlState {
  metadataSearchUrlState: string;
  setMetadataSearchUrlState: (metadataSearch: { metadataSearch?: string }) => void;
}

export interface OverviewProps {
  currentTimeRange: MetricsTimeInput;
  nodeName: string;
  nodeType: InventoryItemType;
  dateRange?: StringDateRange;
  metricsDataView?: DataView;
  logsDataView?: DataView;
}

const DEFAULT_DATE_RANGE = {
  from: 'now-15m',
  to: 'now',
  mode: 'absolute' as const,
};

export const Overview = ({
  nodeName,
  currentTimeRange,
  nodeType,
  dateRange,
  metricsDataView,
  logsDataView,
}: OverviewProps) => {
  const inventoryModel = findInventoryModel(nodeType);
  const { sourceId } = useSourceContext();
  const {
    loading: metadataLoading,
    error: fetchMetadataError,
    metadata,
  } = useMetadata(nodeName, nodeType, inventoryModel.requiredMetrics, sourceId, currentTimeRange);

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={false}>
        <KPIGrid
          nodeName={nodeName}
          dateRange={dateRange ?? DEFAULT_DATE_RANGE}
          dataView={metricsDataView}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {fetchMetadataError ? (
          <EuiCallOut
            title={i18n.translate('xpack.infra.assetDetailsEmbeddable.overview.errorTitle', {
              defaultMessage: 'Sorry, there was an error',
            })}
            color="danger"
            iconType="error"
            data-test-subj="infraMetadataErrorCallout"
          >
            <FormattedMessage
              id="xpack.infra.assetDetailsEmbeddable.overview.errorMessage"
              defaultMessage="There was an error loading your host metadata. Try to {reload} and open the host details again."
              values={{
                reload: (
                  <EuiLink
                    data-test-subj="infraMetadataReloadPageLink"
                    onClick={() => window.location.reload()}
                  >
                    {i18n.translate('xpack.infra.assetDetailsEmbeddable.overview.errorAction', {
                      defaultMessage: 'reload the page',
                    })}
                  </EuiLink>
                ),
              }}
            />
          </EuiCallOut>
        ) : (
          <MetadataSummary metadata={metadata} metadataLoading={metadataLoading} />
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <MetricsGrid
          dateRange={dateRange ?? DEFAULT_DATE_RANGE}
          logsDataView={logsDataView}
          metricsDataView={metricsDataView}
          nodeName={nodeName}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
