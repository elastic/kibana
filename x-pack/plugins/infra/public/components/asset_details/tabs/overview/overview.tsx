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
import { KPIGrid } from './kpi_grid';
import type { StringDateRange, TabIds } from '../../types';

export interface MetadataSearchUrlState {
  metadataSearchUrlState: string;
  setMetadataSearchUrlState: (metadataSearch: { metadataSearch?: string }) => void;
}

export interface KPIProps {
  dateRange?: StringDateRange;
  dataView?: DataView;
}
export interface OverviewProps extends KPIProps {
  currentTimeRange: MetricsTimeInput;
  nodeName: string;
  nodeType: InventoryItemType;
  onTabsStateChange?: (tabId: TabIds) => void;
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
  onTabsStateChange,
  dateRange,
  dataView,
}: OverviewProps) => {
  const inventoryModel = findInventoryModel(nodeType);
  const { sourceId } = useSourceContext();
  const {
    loading: metadataLoading,
    error: fetchMetadataError,
    metadata,
  } = useMetadata(nodeName, nodeType, inventoryModel.requiredMetrics, sourceId, currentTimeRange);

  if (fetchMetadataError) {
    return (
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
          defaultMessage="There was an error loading your data. Try to {reload} and open the host details again."
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
    );
  }

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={false}>
        <KPIGrid
          nodeName={nodeName}
          dateRange={dateRange ?? DEFAULT_DATE_RANGE}
          dataView={dataView}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <MetadataSummary
          metadata={metadata}
          metadataLoading={metadataLoading}
          onShowAllClick={onTabsStateChange}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} />
    </EuiFlexGroup>
  );
};
