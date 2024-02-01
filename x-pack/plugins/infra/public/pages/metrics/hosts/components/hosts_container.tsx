/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { InfraLoadingPanel } from '../../../../components/loading';
import { useMetricsDataViewContext } from '../hooks/use_metrics_data_view';
import { UnifiedSearchBar } from './search_bar/unified_search_bar';
import { HostsContent } from './hosts_content';
import { ErrorCallout } from './error_callout';
import { UnifiedSearchProvider } from '../hooks/use_unified_search';

export const HostContainer = () => {
  const { dataView, loading, error, metricAlias, retry } = useMetricsDataViewContext();

  const isLoading = loading || !dataView;
  if (isLoading && !error) {
    return (
      <InfraLoadingPanel
        height="100%"
        width="auto"
        text={i18n.translate('xpack.infra.waffle.loadingDataText', {
          defaultMessage: 'Loading data',
        })}
      />
    );
  }

  return error ? (
    <ErrorCallout
      error={error}
      titleOverride={i18n.translate('xpack.infra.hostsViewPage.errorOnCreateOrLoadDataviewTitle', {
        defaultMessage: 'Error creating Data View',
      })}
      messageOverride={i18n.translate('xpack.infra.hostsViewPage.errorOnCreateOrLoadDataview', {
        defaultMessage:
          'There was an error trying to create a Data View: {metricAlias}. Try reloading the page.',
        values: { metricAlias },
      })}
      onTryAgainClick={retry}
      hasTryAgainButton
    />
  ) : (
    <UnifiedSearchProvider>
      <UnifiedSearchBar />
      <EuiSpacer size="m" />
      <HostsContent />
    </UnifiedSearchProvider>
  );
};
