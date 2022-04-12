/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { EuiButton, EuiFlyout, EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import { useTrackPageview } from '../..';
import { DatePicker } from '../../components/shared/date_picker';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useHasData } from '../../hooks/use_has_data';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useDatePickerContext } from '../../hooks/use_date_picker_context';
import { RouteParams } from '../../routes';
import { getNoDataConfig } from '../../utils/no_data_config';
import { LoadingObservability } from './loading_observability';
import { ObservabilityStatus } from '../../components/app/observability_status';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { ObservabilityAppServices } from '../../application/types';

interface Props {
  routeParams: RouteParams<'/overview'>;
}

export function OverviewPage({ routeParams }: Props) {
  useTrackPageview({ app: 'observability-overview', path: 'overview' });
  useTrackPageview({ app: 'observability-overview', path: 'overview', delay: 15000 });
  useBreadcrumbs([
    {
      text: i18n.translate('xpack.observability.breadcrumbs.overviewLinkText', {
        defaultMessage: 'Overview',
      }),
    },
  ]);

  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);

  const { docLinks, http } = useKibana<ObservabilityAppServices>().services;
  const { ObservabilityPageTemplate } = usePluginContext();

  const { relativeStart, relativeEnd } = useDatePickerContext();

  const relativeTime = { start: relativeStart, end: relativeEnd };

  const { hasAnyData, isAllRequestsComplete } = useHasData();

  if (hasAnyData === undefined) {
    return <LoadingObservability />;
  }

  const hasData = hasAnyData === true || (isAllRequestsComplete === false ? undefined : false);

  const noDataConfig = getNoDataConfig({
    hasData,
    basePath: http.basePath,
    docsLink: docLinks.links.observability.guide,
  });

  const { refreshInterval = 10000, refreshPaused = true } = routeParams.query;

  return (
    <ObservabilityPageTemplate
      noDataConfig={noDataConfig}
      pageHeader={
        hasData
          ? {
              pageTitle: overviewPageTitle,
              rightSideItems: [
                <DatePicker
                  rangeFrom={relativeTime.start}
                  rangeTo={relativeTime.end}
                  refreshInterval={refreshInterval}
                  refreshPaused={refreshPaused}
                />,
              ],
            }
          : undefined
      }
    >
      {hasData && (
        <>
          <EuiButton onClick={() => setIsFlyoutVisible(true)}>Show observability status</EuiButton>
          {isFlyoutVisible && (
            <EuiFlyout
              size="s"
              ownFocus
              onClose={() => setIsFlyoutVisible(false)}
              aria-labelledby="flyout-id"
            >
              <EuiFlyoutHeader hasBorder>
                <EuiTitle size="m">
                  <h2 id="flyout-id">Status</h2>
                </EuiTitle>
              </EuiFlyoutHeader>
              <EuiFlyoutBody>
                <ObservabilityStatus />
              </EuiFlyoutBody>
            </EuiFlyout>
          )}
        </>
      )}
    </ObservabilityPageTemplate>
  );
}

const overviewPageTitle = i18n.translate('xpack.observability.overview.pageTitle', {
  defaultMessage: 'Overview',
});
