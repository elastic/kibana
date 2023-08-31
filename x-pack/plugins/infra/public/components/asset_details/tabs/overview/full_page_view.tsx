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
import { MetadataSummaryList } from './metadata_summary/metadata_summary_list';
import { AlertsSummaryContent } from './alerts';
import { KPIGrid } from './kpis/kpi_grid';
import { MetricsGrid } from './metrics/metrics_grid';
import { useAssetDetailsRenderPropsContext } from '../../hooks/use_asset_details_render_props';
import { useMetadataStateProviderContext } from '../../hooks/use_metadata_state';
import { useDataViewsProviderContext } from '../../hooks/use_data_views';
import { useDateRangeProviderContext } from '../../hooks/use_date_range';
import { SectionSeparator } from './section_separator';

export const FullPageView = () => {
  const { dateRange } = useDateRangeProviderContext();
  const { asset, assetType } = useAssetDetailsRenderPropsContext();
  const {
    metadata,
    loading: metadataLoading,
    error: fetchMetadataError,
  } = useMetadataStateProviderContext();
  const { logs, metrics } = useDataViewsProviderContext();

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem grow={false}>
        <KPIGrid nodeName={asset.name} timeRange={dateRange} dataView={metrics.dataView} />
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
                    data-test-subj="infraAssetDetailsMetadataReloadPageLink"
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
        <AlertsSummaryContent assetName={asset.name} assetType={assetType} dateRange={dateRange} />
        <SectionSeparator />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <MetricsGrid
          timeRange={dateRange}
          logsDataView={logs.dataView}
          metricsDataView={metrics.dataView}
          nodeName={asset.name}
          showNginxStubstatus={
            !!metadata?.features.find((feature) => feature.name === 'nginx.stubstatus')
          }
          showNginxAccess={!!metadata?.features.find((feature) => feature.name === 'nginx.acces')}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
