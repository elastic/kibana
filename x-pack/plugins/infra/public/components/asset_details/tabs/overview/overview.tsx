/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { InventoryItemType } from '../../../../../common/inventory_models/types';
import { findInventoryModel } from '../../../../../common/inventory_models';
import type { MetricsTimeInput } from '../../../../pages/metrics/metric_detail/hooks/use_metrics_time';
import { useMetadata } from '../../hooks/use_metadata';
import { useSourceContext } from '../../../../containers/metrics_source';
import { MetadataSummary } from './metadata_summary';
import { KPIGrid } from './kpi_grid';

export interface MetadataSearchUrlState {
  metadataSearchUrlState: string;
  setMetadataSearchUrlState: (metadataSearch: { metadataSearch?: string }) => void;
}

export interface MetadataProps {
  currentTimeRange: MetricsTimeInput;
  nodeName: string;
  nodeType: InventoryItemType;
  showActionsColumn?: boolean;
  search?: string;
  onSearchChange?: (query: string) => void;
}

export const Overview = ({ nodeName, currentTimeRange, nodeType }: MetadataProps) => {
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
        title={i18n.translate('xpack.infra.metadataEmbeddable.errorTitle', {
          defaultMessage: 'Sorry, there was an error',
        })}
        color="danger"
        iconType="error"
        data-test-subj="infraMetadataErrorCallout"
      >
        <FormattedMessage
          id="xpack.infra.metadataEmbeddable.errorMessage"
          defaultMessage="There was an error loading your data. Try to {reload} and open the host details again."
          values={{
            reload: (
              <EuiLink
                data-test-subj="infraMetadataReloadPageLink"
                onClick={() => window.location.reload()}
              >
                {i18n.translate('xpack.infra.metadataEmbeddable.errorAction', {
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
        <KPIGrid nodeName={nodeName} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <MetadataSummary metadata={metadata} metadataLoading={metadataLoading} />
      </EuiFlexItem>
      <EuiFlexItem grow={false} />
    </EuiFlexGroup>
  );
};
