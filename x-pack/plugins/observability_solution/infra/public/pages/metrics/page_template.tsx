/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { LazyObservabilityPageTemplateProps } from '@kbn/observability-shared-plugin/public';
import type { NoDataConfig } from '@kbn/shared-ux-page-kibana-template';
import React, { useEffect } from 'react';
import {
  noMetricIndicesPromptDescription,
  noMetricIndicesPromptPrimaryActionTitle,
  NoRemoteCluster,
} from '../../components/empty_states';
import { SourceErrorPage } from '../../components/source_error_page';
import { SourceLoadingPage } from '../../components/source_loading_page';
import { useMetricsDataViewContext, useSourceContext } from '../../containers/metrics_source';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';
import { ErrorCallout } from './hosts/components/error_callout';

export const MetricsPageTemplate: React.FC<LazyObservabilityPageTemplateProps> = ({
  'data-test-subj': _dataTestSubj,
  ...pageTemplateProps
}) => {
  const {
    services: {
      observabilityAIAssistant,
      observabilityShared: {
        navigation: { PageTemplate },
      },
      docLinks,
    },
  } = useKibanaContextForPlugin();

  const { source, error: sourceError, loadSource, isLoading } = useSourceContext();
  const { error: dataViewLoadError, refetch: loadDataView } = useMetricsDataViewContext();
  const { remoteClustersExist, metricIndicesExist } = source?.status ?? {};

  const noDataConfig: NoDataConfig | undefined = metricIndicesExist
    ? undefined
    : {
        solution: i18n.translate('xpack.infra.metrics.noDataConfig.solutionName', {
          defaultMessage: 'Observability',
        }),
        action: {
          beats: {
            title: noMetricIndicesPromptPrimaryActionTitle,
            description: noMetricIndicesPromptDescription,
          },
        },
        docsLink: docLinks.links.observability.guide,
      };

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
        ...(!metricIndicesExist
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
  }, [metricIndicesExist, setScreenContext, source]);

  if (isLoading && !source) return <SourceLoadingPage />;

  if (!remoteClustersExist) {
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
      data-test-subj={metricIndicesExist ? _dataTestSubj : 'noDataPage'}
      noDataConfig={noDataConfig}
      {...pageTemplateProps}
    />
  );
};
