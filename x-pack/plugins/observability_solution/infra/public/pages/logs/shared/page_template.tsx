/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import type { LazyObservabilityPageTemplateProps } from '@kbn/observability-shared-plugin/public';
import { OBSERVABILITY_ONBOARDING_LOCATOR } from '@kbn/deeplinks-observability';
import { NoDataConfig } from '@kbn/shared-ux-page-kibana-template';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';

export interface LogsPageTemplateProps extends LazyObservabilityPageTemplateProps {
  hasData?: boolean;
  isDataLoading?: boolean;
}

export const LogsPageTemplate: React.FC<LogsPageTemplateProps> = ({
  hasData = true,
  isDataLoading = false,
  'data-test-subj': _dataTestSubj,
  ...pageTemplateProps
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
  const href = onboardingLocator?.getRedirectUrl({ category: 'logs' });
  const { setScreenContext } = observabilityAIAssistant?.service || {};

  useEffect(() => {
    return setScreenContext?.({
      starterPrompts: [
        ...(!isDataLoading && !hasData
          ? [
              {
                title: i18n.translate(
                  'xpack.infra.aiAssistant.starterPrompts.explainNoData.title',
                  {
                    defaultMessage: 'Explain',
                  }
                ),
                prompt: i18n.translate(
                  'xpack.infra.aiAssistant.starterPrompts.explainNoData.prompt',
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
  }, [hasData, isDataLoading, setScreenContext]);

  const noDataConfig: NoDataConfig | undefined = hasData
    ? undefined
    : {
        solution: i18n.translate('xpack.infra.logs.noDataConfig.solutionName', {
          defaultMessage: 'Observability',
        }),
        action: {
          beats: {
            title: i18n.translate('xpack.infra.logs.noDataConfig.beatsCard.title', {
              defaultMessage: 'Add a logging integration',
            }),
            description: i18n.translate('xpack.infra.logs.noDataConfig.beatsCard.description', {
              defaultMessage:
                'Use the Elastic Agent or Beats to send logs to Elasticsearch. We make it easy with integrations for many popular systems and apps.',
            }),
            href,
          },
        },
        docsLink: docLinks.links.observability.guide,
      };

  return (
    <PageTemplate
      data-test-subj={hasData ? _dataTestSubj : 'noDataPage'}
      noDataConfig={noDataConfig}
      isPageDataLoaded={isDataLoading === false}
      {...pageTemplateProps}
    />
  );
};
