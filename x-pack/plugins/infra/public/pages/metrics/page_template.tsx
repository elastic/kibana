/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { LazyObservabilityPageTemplateProps } from '@kbn/observability-plugin/public';
import { KibanaPageTemplateProps } from '@kbn/kibana-react-plugin/public';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';

interface MetricsPageTemplateProps extends LazyObservabilityPageTemplateProps {
  hasData?: boolean;
}

export const MetricsPageTemplate: React.FC<MetricsPageTemplateProps> = ({
  hasData = true,
  'data-test-subj': _dataTestSubj,
  ...pageTemplateProps
}) => {
  const {
    services: {
      observability: {
        navigation: { PageTemplate },
      },
      docLinks,
    },
  } = useKibanaContextForPlugin();

  const noDataConfig: KibanaPageTemplateProps['noDataConfig'] = hasData
    ? undefined
    : {
        solution: i18n.translate('xpack.infra.metrics.noDataConfig.solutionName', {
          defaultMessage: 'Observability',
        }),
        actions: {
          beats: {
            title: i18n.translate('xpack.infra.metrics.noDataConfig.beatsCard.title', {
              defaultMessage: 'Add a metrics integration',
            }),
            description: i18n.translate('xpack.infra.metrics.noDataConfig.beatsCard.description', {
              defaultMessage:
                'Use Beats to send metrics data to Elasticsearch. We make it easy with modules for many popular systems and apps.',
            }),
          },
        },
        docsLink: docLinks.links.observability.guide,
      };

  return (
    <PageTemplate
      data-test-subj={hasData ? _dataTestSubj : 'noDataPage'}
      noDataConfig={noDataConfig}
      {...pageTemplateProps}
    />
  );
};
