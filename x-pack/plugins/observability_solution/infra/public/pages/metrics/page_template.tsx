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
} from '../../components/empty_states';
import { useSourceContext } from '../../containers/metrics_source';
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
      observabilityAIAssistant,
      observabilityShared: {
        navigation: { PageTemplate },
      },
      docLinks,
    },
  } = useKibanaContextForPlugin();

  const { source } = useSourceContext();

  const noDataConfig: NoDataConfig | undefined = hasData
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
      screenDescription: source
        ? `The configuration of Metrics is ${JSON.stringify(source.configuration)}`
        : '',
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

  return (
    <PageTemplate
      data-test-subj={hasData ? _dataTestSubj : 'noDataPage'}
      noDataConfig={noDataConfig}
      {...pageTemplateProps}
    />
  );
};
