/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { textService } from '../text';

import { ManagementAppMountParams } from '../../../../../../../src/plugins/management/public';

type SetBreadcrumbs = ManagementAppMountParams['setBreadcrumbs'];

export enum BREADCRUMB_SECTION {
  HOME = 'home',
  CLONE_TRANSFORM = 'cloneTransform',
  CREATE_TRANSFORM = 'createTransform',
}

interface BreadcrumbItem {
  text: string;
  href?: string;
}

type Breadcrumbs = {
  [key in BREADCRUMB_SECTION]: BreadcrumbItem[];
};

class BreadcrumbService {
  private breadcrumbs: Breadcrumbs = {
    home: [],
    cloneTransform: [],
    createTransform: [],
  };
  private setBreadcrumbsHandler?: SetBreadcrumbs;

  public setup(setBreadcrumbsHandler: SetBreadcrumbs): void {
    this.setBreadcrumbsHandler = setBreadcrumbsHandler;

    // Home and sections
    this.breadcrumbs.home = [
      {
        text: textService.breadcrumbs.home,
        href: '/',
      },
    ];
    this.breadcrumbs.cloneTransform = [
      ...this.breadcrumbs.home,
      {
        text: textService.breadcrumbs.cloneTransform,
      },
    ];
    this.breadcrumbs.createTransform = [
      ...this.breadcrumbs.home,
      {
        text: textService.breadcrumbs.createTransform,
      },
    ];
  }

  public setBreadcrumbs(type: BREADCRUMB_SECTION): void {
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

export const breadcrumbService = new BreadcrumbService();
