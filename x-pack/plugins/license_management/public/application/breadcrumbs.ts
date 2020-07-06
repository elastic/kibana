/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import { ManagementAppMountParams } from '../../../../../src/plugins/management/public';

type SetBreadcrumbs = ManagementAppMountParams['setBreadcrumbs'];

export class BreadcrumbService {
  private breadcrumbs: {
    [key: string]: Array<{
      text: string;
      href?: string;
    }>;
  } = {
    dashboard: [],
    upload: [],
  };
  private setBreadcrumbsHandler?: SetBreadcrumbs;

  public setup(setBreadcrumbsHandler: SetBreadcrumbs): void {
    this.setBreadcrumbsHandler = setBreadcrumbsHandler;

    // Home and sections
    this.breadcrumbs.dashboard = [
      {
        text: i18n.translate('xpack.licenseMgmt.dashboard.breadcrumb', {
          defaultMessage: 'License management',
        }),
        href: `/`,
      },
    ];

    this.breadcrumbs.upload = [
      ...this.breadcrumbs.dashboard,
      {
        text: i18n.translate('xpack.licenseMgmt.upload.breadcrumb', {
          defaultMessage: 'Upload',
        }),
      },
    ];
  }

  public setBreadcrumbs(type: 'dashboard' | 'upload'): void {
    if (!this.setBreadcrumbsHandler) {
      throw new Error(`BreadcrumbService#setup() must be called first!`);
    }

    const newBreadcrumbs = this.breadcrumbs[type]
      ? [...this.breadcrumbs[type]]
      : [...this.breadcrumbs.home];

    // Pop off last breadcrumb
    const lastBreadcrumb = newBreadcrumbs.pop() as {
      text: string;
      href?: string;
    };

    // Put last breadcrumb back without href
    newBreadcrumbs.push({
      ...lastBreadcrumb,
      href: undefined,
    });

    this.setBreadcrumbsHandler(newBreadcrumbs);
  }
}
