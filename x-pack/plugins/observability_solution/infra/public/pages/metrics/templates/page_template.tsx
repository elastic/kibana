/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OBSERVABILITY_ONBOARDING_LOCATOR } from '@kbn/deeplinks-observability';
import { i18n } from '@kbn/i18n';
import type { LazyObservabilityPageTemplateProps } from '@kbn/observability-shared-plugin/public';
import React, { useEffect } from 'react';
import type { EuiCardProps } from '@elastic/eui';
import { NoDataPageProps } from '@kbn/shared-ux-page-no-data-types';
import { NoDataConfig } from '@kbn/shared-ux-page-no-data-config-types';
import { GetHasDataResponse } from '../../../../common/metrics_sources/get_has_data';
import {
  NoRemoteCluster,
  noMetricIndicesPromptDescription,
  noMetricIndicesPromptTitle,
} from '../../../components/empty_states';
import { SourceErrorPage } from '../../../components/source_error_page';
import { useMetricsDataViewContext, useSourceContext } from '../../../containers/metrics_source';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { ErrorCallout } from '../hosts/components/error_callout';
import { isPending, useFetcher } from '../../../hooks/use_fetcher';
import { getNoDataConfigDetails } from './no_data_config';

export const getNoDataConfig = ({
  hasData,
  loading,
  defaultCardConfig,
  defaultPageConfig,
  noDataConfigOverride,
  onboardingHref,
}: {
  hasData: boolean;
  loading: boolean;
  defaultCardConfig?: Pick<EuiCardProps, 'title' | 'description'>;
  defaultPageConfig?: Pick<NoDataPageProps, 'pageTitle' | 'pageDescription' | 'docsLink'>;
  noDataConfigOverride?: NoDataConfig;
  onboardingHref?: string;
}): NoDataConfig | undefined => {
  if (hasData || loading) {
    return;
  }

  return (
    noDataConfigOverride &&
    getNoDataConfigDetails({ card: defaultCardConfig, page: defaultPageConfig, onboardingHref })
  );
};

export const MetricsPageTemplate = ({
  'data-test-subj': _dataTestSubj,
  dataAvailabilityModules,
  onboardingFlow = 'infra',
  noDataConfig: noDataConfigOverride,
  ...pageTemplateProps
}: LazyObservabilityPageTemplateProps & {
  dataAvailabilityModules?: string[];
  onboardingFlow?: 'infra' | 'logs';
}) => {
  const {
    services: {
      observabilityAIAssistant,
      observabilityShared: {
        navigation: { PageTemplate },
      },
      share,
      docLinks,
    },
  } = useKibanaContextForPlugin();

  const onboardingLocator = share.url.locators.get(OBSERVABILITY_ONBOARDING_LOCATOR);
  const href = onboardingLocator?.getRedirectUrl({ category: onboardingFlow });

  const { source, error: sourceError, loadSource, isLoading } = useSourceContext();
  const { error: dataViewLoadError, refetch: loadDataView } = useMetricsDataViewContext();
  const { remoteClustersExist } = source?.status ?? {};

  const { data, status } = useFetcher(async (callApi) => {
    return await callApi<GetHasDataResponse>('/api/metrics/source/hasData', {
      method: 'GET',
      query: {
        modules: dataAvailabilityModules,
      },
    });
  });

  const hasData = !!data?.hasData;
  const noDataConfig = getNoDataConfig({
    hasData,
    loading: isPending(status),
    defaultCardConfig: {
      title: noMetricIndicesPromptTitle,
      description: noMetricIndicesPromptDescription,
    },
    defaultPageConfig: {
      docsLink: docLinks.links.observability.guide,
    },
    noDataConfigOverride,
    onboardingHref: href,
  });

  const { setScreenContext } = observabilityAIAssistant?.service || {};

  useEffect(() => {
    return setScreenContext?.({
      data: [
        {
          name: 'Metrics configuration',
          value: source,
          description: 'The configuration of the Metrics app',
        },
      ],
      starterPrompts: [
        ...(!hasData
          ? [
              {
                title: i18n.translate(
                  'xpack.infra.metrics.aiAssistant.starterPrompts.explainNoData.title',
                  {
                    defaultMessage: 'Explain',
                  }
                ),
                prompt: i18n.translate(
                  'xpack.infra.metrics.aiAssistant.starterPrompts.explainNoData.prompt',
                  {
                    defaultMessage: "Why don't I see any data?",
                  }
                ),
                icon: 'sparkles',
              },
            ]
          : []),
      ],
    });
  }, [hasData, setScreenContext, source]);

  if (!isLoading && !remoteClustersExist) {
    return <NoRemoteCluster />;
  }

  if (sourceError) {
    <SourceErrorPage errorMessage={sourceError} retry={loadSource} />;
  }

  if (dataViewLoadError) {
    <ErrorCallout
      error={dataViewLoadError}
      titleOverride={i18n.translate('xpack.infra.hostsViewPage.errorOnCreateOrLoadDataviewTitle', {
        defaultMessage: 'Error creating Data View',
      })}
      messageOverride={i18n.translate('xpack.infra.hostsViewPage.errorOnCreateOrLoadDataview', {
        defaultMessage:
          'There was an error trying to create a Data View: {metricAlias}. Try reloading the page.',
        values: { metricAlias: source?.configuration.metricAlias ?? '' },
      })}
      onTryAgainClick={loadDataView}
      hasTryAgainButton
    />;
  }

  return (
    <PageTemplate
      data-test-subj={hasData ? _dataTestSubj : 'noDataPage'}
      noDataConfig={noDataConfig}
      {...pageTemplateProps}
    />
  );
};
