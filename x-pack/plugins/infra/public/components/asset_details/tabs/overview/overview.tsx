/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { findInventoryModel } from '../../../../../common/inventory_models';
import { useMetadata } from '../../hooks/use_metadata';
import { useSourceContext } from '../../../../containers/metrics_source';
import { MetadataSummaryList } from './metadata_summary/metadata_summary_list';
import { AlertsSummaryContent } from './alerts';
import { KPIGrid } from './kpis/kpi_grid';
import { MetricsGrid } from './metrics/metrics_grid';
import { toTimestampRange } from '../../utils';
import { useAssetDetailsStateContext } from '../../hooks/use_asset_details_state';

export const Overview = () => {
  const { node, nodeType, overrides, dateRange } = useAssetDetailsStateContext();
  const { logsDataView, metricsDataView } = overrides?.overview ?? {};

  const inventoryModel = findInventoryModel(nodeType);
  const { sourceId } = useSourceContext();
  const {
    loading: metadataLoading,
    error: fetchMetadataError,
    metadata,
  } = useMetadata(
    node.name,
    nodeType,
    inventoryModel.requiredMetrics,
    sourceId,
    toTimestampRange(dateRange)
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <KPIGrid nodeName={node.name} timeRange={dateRange} dataView={metricsDataView} />
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
          <MetadataSummaryList metadata={metadata} metadataLoading={metadataLoading} />
        )}
        <SectionSeparator />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <AlertsSummaryContent nodeName={node.name} nodeType={nodeType} dateRange={dateRange} />
        <SectionSeparator />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <MetricsGrid
          timeRange={dateRange}
          logsDataView={logsDataView}
          metricsDataView={metricsDataView}
          nodeName={node.name}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const SectionSeparator = () => (
  <EuiHorizontalRule
    margin="m"
    css={css`
      margin-bottom: 0;
    `}
  />
);
