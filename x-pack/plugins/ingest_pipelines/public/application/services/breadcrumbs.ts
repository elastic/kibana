/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ManagementAppMountParams } from '@kbn/management-plugin/public';

type SetBreadcrumbs = ManagementAppMountParams['setBreadcrumbs'];

const homeBreadcrumbText = i18n.translate('xpack.ingestPipelines.breadcrumb.pipelinesLabel', {
  defaultMessage: 'Ingest Pipelines',
});

export class BreadcrumbService {
  private breadcrumbs: {
    [key: string]: Array<{
      text: string;
      href?: string;
    }>;
  } = {
    home: [
      {
        text: homeBreadcrumbText,
      },
    ],
    create: [
      {
        text: homeBreadcrumbText,
        href: `/`,
      },
      {
        text: i18n.translate('xpack.ingestPipelines.breadcrumb.createPipelineLabel', {
          defaultMessage: 'Create pipeline',
        }),
      },
    ],
    edit: [
      {
        text: homeBreadcrumbText,
        href: `/`,
      },
      {
        text: i18n.translate('xpack.ingestPipelines.breadcrumb.editPipelineLabel', {
          defaultMessage: 'Edit pipeline',
        }),
      },
    ],
  };

  private setBreadcrumbsHandler?: SetBreadcrumbs;

  public setup(setBreadcrumbsHandler: SetBreadcrumbs): void {
    this.setBreadcrumbsHandler = setBreadcrumbsHandler;
  }

  public setBreadcrumbs(type: 'create' | 'home' | 'edit'): void {
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
