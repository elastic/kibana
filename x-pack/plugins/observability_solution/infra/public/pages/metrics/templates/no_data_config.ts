/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NoDataConfig } from '@kbn/shared-ux-page-no-data-config-types';
import { i18n } from '@kbn/i18n';
import type { EuiCardProps } from '@elastic/eui';
import { NoDataPageProps } from '@kbn/shared-ux-page-no-data-types';

interface NoDataConfigDetails {
  card?: Pick<EuiCardProps, 'title' | 'description'>;
  page?: Pick<NoDataPageProps, 'pageTitle' | 'pageDescription' | 'docsLink'>;
  onboardingHref?: string;
}

export const getNoDataConfigDetails = ({
  card,
  page,
  onboardingHref,
}: NoDataConfigDetails): NoDataConfig => {
  return {
    ...page,
    solution: i18n.translate('xpack.infra.metrics.noDataConfig.solutionName', {
      defaultMessage: 'Observability',
    }),
    action: {
      beats: {
        ...card,
        href: onboardingHref,
      },
    },
  };
};
