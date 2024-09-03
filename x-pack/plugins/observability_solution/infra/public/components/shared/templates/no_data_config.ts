/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { EuiCardProps } from '@elastic/eui';
import type { NoDataConfig } from '@kbn/shared-ux-page-kibana-template';
import { NoDataPageProps } from '@kbn/shared-ux-page-no-data-types';
import { LocatorClient } from '@kbn/share-plugin/common/url_service';
import {
  OBSERVABILITY_ONBOARDING_LOCATOR,
  type ObservabilityOnboardingLocatorParams,
} from '@kbn/deeplinks-observability';
import { noMetricIndicesPromptDescription, noMetricIndicesPromptTitle } from '../../empty_states';

export enum OnboardingFlow {
  Infra = 'infra',
  Hosts = 'logs',
}

interface NoDataConfigDetails {
  onboardingFlow: OnboardingFlow;
  docsLink?: string;
  locators: LocatorClient;
}

const createCardConfig = (
  onboardingFlow: OnboardingFlow,
  locators: LocatorClient
): Pick<EuiCardProps, 'title' | 'description' | 'href'> => {
  const onboardingLocator = locators.get<ObservabilityOnboardingLocatorParams>(
    OBSERVABILITY_ONBOARDING_LOCATOR
  );
  switch (onboardingFlow) {
    case OnboardingFlow.Hosts: {
      return {
        title: i18n.translate('xpack.infra.hostsViewPage.noData.card.cta', {
          defaultMessage: 'Add data',
        }),
        description: i18n.translate('xpack.infra.hostsViewPage.noData.card.description', {
          defaultMessage:
            'Start collecting data for your hosts to understand metric trends, explore logs and deep insight into their performance',
        }),
        href: onboardingLocator?.getRedirectUrl({ category: onboardingFlow }),
      };
    }
    default: {
      return {
        title: noMetricIndicesPromptTitle,
        description: noMetricIndicesPromptDescription,
        href: onboardingLocator?.getRedirectUrl({ category: onboardingFlow }),
      };
    }
  }
};

const createPageConfig = (
  onboardingFlow: OnboardingFlow,
  docsLink?: string
): Pick<NoDataPageProps, 'pageTitle' | 'pageDescription' | 'docsLink'> | undefined => {
  switch (onboardingFlow) {
    case OnboardingFlow.Hosts: {
      return {
        pageTitle: i18n.translate('xpack.infra.hostsViewPage.noData.page.title', {
          defaultMessage: 'Detect and resolve problems with your hosts',
        }),
        pageDescription: i18n.translate('xpack.infra.hostsViewPage.noData.page.description', {
          defaultMessage:
            'Understand how your hosts are performing so you can take action before it becomes a problem.',
        }),
      };
    }
    default: {
      return {
        docsLink,
      };
    }
  }
};

const getNoDataConfigDetails = ({
  onboardingFlow,
  locators,
  docsLink,
}: NoDataConfigDetails): NoDataConfig => {
  return {
    ...createPageConfig(onboardingFlow, docsLink),
    solution: i18n.translate('xpack.infra.metrics.noDataConfig.solutionName', {
      defaultMessage: 'Observability',
    }),
    action: {
      beats: {
        ...createCardConfig(onboardingFlow, locators),
      },
    },
  };
};

export const getNoDataConfig = ({
  hasData,
  loading,
  locators,
  onboardingFlow,
  docsLink,
}: {
  hasData: boolean;
  loading: boolean;
  onboardingFlow: OnboardingFlow;
  locators: LocatorClient;
  docsLink?: string;
}): NoDataConfig | undefined => {
  if (hasData || loading) {
    return;
  }

  return getNoDataConfigDetails({ onboardingFlow, locators, docsLink });
};
