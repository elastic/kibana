/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import { CRUD_APP_BASE_PATH } from '../constants';

interface Breadcrumb {
  text: string;
  href?: string;
}
interface Breadcrumbs {
  home: Breadcrumb;
  add: Breadcrumb;
  edit: Breadcrumb;
}

let _setBreadcrumbs: (breadcrumbs: Breadcrumb[]) => void;
let _breadcrumbs: Breadcrumbs;

export function init(setGlobalBreadcrumbs: (breadcrumbs: Breadcrumb[]) => void): void {
  _setBreadcrumbs = setGlobalBreadcrumbs;
  _breadcrumbs = {
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

export function setBreadcrumbs(type: 'home' | 'add' | 'edit', queryParams?: string): void {
  if (!_breadcrumbs[type]) {
    return;
  }

  if (type === 'home') {
    _setBreadcrumbs([_breadcrumbs.home]);
  } else {
    // Support deep-linking back to a remote cluster in the detail panel.
    const homeBreadcrumb = {
      text: _breadcrumbs.home.text,
      href: `${_breadcrumbs.home.href}${queryParams}`,
    };

    _setBreadcrumbs([homeBreadcrumb, _breadcrumbs[type]]);
  }
}
