/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CRUD_APP_BASE_PATH } from '../constants';

let setFullBreadcrumbs: any;
let breadcrumbs: any;

export function init(chrome: any, managementBreadcrumb: any, i18n: any): void {
  setFullBreadcrumbs = chrome.breadcrumbs.set;
  breadcrumbs = {
    management: managementBreadcrumb,
    home: {
      text: i18n.translate('xpack.remoteClusters.listBreadcrumbTitle', {
        defaultMessage: 'Remote Clusters',
      }),
      href: `#${CRUD_APP_BASE_PATH}/list`,
    },
    add: {
      text: i18n.translate('xpack.remoteClusters.addBreadcrumbTitle', {
        defaultMessage: 'Add',
      }),
    },
    edit: {
      text: i18n.translate('xpack.remoteClusters.editBreadcrumbTitle', {
        defaultMessage: 'Edit',
      }),
    },
  };
}

export function setBreadcrumbs(type: string, queryParams?: string): void {
  if (!breadcrumbs[type]) {
    return;
  }

  if (type === 'home') {
    setFullBreadcrumbs([breadcrumbs.management, breadcrumbs.home]);
  } else {
    // Support deep-linking back to a remote cluster in the detail panel.
    const homeBreadcrumb = {
      text: breadcrumbs.home.text,
      href: `${breadcrumbs.home.href}${queryParams}`,
    };

    setFullBreadcrumbs([breadcrumbs.management, homeBreadcrumb, breadcrumbs[type]]);
  }
}
