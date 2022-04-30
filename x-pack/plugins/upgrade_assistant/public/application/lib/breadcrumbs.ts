/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ManagementAppMountParams } from '../../../../../../src/plugins/management/public';

type SetBreadcrumbs = ManagementAppMountParams['setBreadcrumbs'];

const i18nTexts = {
  breadcrumbs: {
    overview: i18n.translate('xpack.upgradeAssistant.breadcrumb.overviewLabel', {
      defaultMessage: 'Upgrade Assistant',
    }),
    esDeprecations: i18n.translate('xpack.upgradeAssistant.breadcrumb.esDeprecationsLabel', {
      defaultMessage: 'Elasticsearch deprecation issues',
    }),
    esDeprecationLogs: i18n.translate('xpack.upgradeAssistant.breadcrumb.esDeprecationLogsLabel', {
      defaultMessage: 'Elasticsearch deprecation logs',
    }),
    kibanaDeprecations: i18n.translate(
      'xpack.upgradeAssistant.breadcrumb.kibanaDeprecationsLabel',
      {
        defaultMessage: 'Kibana deprecation issues',
      }
    ),
  },
};

export class BreadcrumbService {
  private breadcrumbs: {
    [key: string]: Array<{
      text: string;
      href?: string;
    }>;
  } = {
    overview: [
      {
        text: i18nTexts.breadcrumbs.overview,
      },
    ],
    esDeprecations: [
      {
        text: i18nTexts.breadcrumbs.overview,
        href: '/',
      },
      {
        text: i18nTexts.breadcrumbs.esDeprecations,
      },
    ],
    esDeprecationLogs: [
      {
        text: i18nTexts.breadcrumbs.overview,
        href: '/',
      },
      {
        text: i18nTexts.breadcrumbs.esDeprecationLogs,
      },
    ],
    kibanaDeprecations: [
      {
        text: i18nTexts.breadcrumbs.overview,
        href: '/',
      },
      {
        text: i18nTexts.breadcrumbs.kibanaDeprecations,
      },
    ],
  };

  private setBreadcrumbsHandler?: SetBreadcrumbs;

  public setup(setBreadcrumbsHandler: SetBreadcrumbs): void {
    this.setBreadcrumbsHandler = setBreadcrumbsHandler;
  }

  public setBreadcrumbs(
    type: 'overview' | 'esDeprecations' | 'esDeprecationLogs' | 'kibanaDeprecations'
  ): void {
    if (!this.setBreadcrumbsHandler) {
      throw new Error('Breadcrumb service has not been initialized');
    }

    const newBreadcrumbs = this.breadcrumbs[type]
      ? [...this.breadcrumbs[type]]
      : [...this.breadcrumbs.home];

    this.setBreadcrumbsHandler(newBreadcrumbs);
  }
}

export const breadcrumbService = new BreadcrumbService();
