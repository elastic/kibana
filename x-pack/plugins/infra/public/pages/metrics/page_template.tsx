/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';
import type { LazyObservabilityPageTemplateProps } from '../../../../observability/public';
import { KibanaPageTemplateProps } from '../../../../../../src/plugins/kibana_react/public';
import { Source } from '../../containers/metrics_source';
import { useLinkProps } from '../../hooks/use_link_props';

export const MetricsPageTemplate: React.FC<LazyObservabilityPageTemplateProps> = (
  pageTemplateProps
) => {
  const {
    services: {
      observability: {
        navigation: { PageTemplate },
      },
      docLinks,
    },
  } = useKibanaContextForPlugin();

  const tutorialLinkProps = useLinkProps({
    app: 'home',
    hash: '/tutorial_directory/metrics',
  });

  const { metricIndicesExist } = useContext(Source.Context);
  const noDataConfig: KibanaPageTemplateProps['noDataConfig'] = metricIndicesExist
    ? undefined
    : {
        solution: i18n.translate('xpack.infra.metrics.noDataConfig.solutionName', {
          defaultMessage: 'Observability',
        }),
        actions: {
          beats: {
            title: i18n.translate('xpack.infra.metrics.noDataConfig.beatsCard.title', {
              defaultMessage: 'Add metrics with Beats',
            }),
            description: i18n.translate('xpack.infra.metrics.noDataConfig.beatsCard.description', {
              defaultMessage:
                'Use Beats to send metrics data to Elasticsearch. We make it easy with modules for many popular systems and apps.',
            }),
            ...tutorialLinkProps,
          },
        },
        docsLink: docLinks.links.observability.guide,
      };

  return <PageTemplate noDataConfig={noDataConfig} {...pageTemplateProps} />;
};
