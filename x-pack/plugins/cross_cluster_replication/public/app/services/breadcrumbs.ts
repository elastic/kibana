/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ChromeBreadcrumb } from 'src/core/public';

import { ManagementAppMountParams } from '../../../../../../src/plugins/management/public';

export type SetBreadcrumbs = ManagementAppMountParams['setBreadcrumbs'];

let setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;

export const init = (_setBreadcrumbs: SetBreadcrumbs): void => {
  setBreadcrumbs = _setBreadcrumbs;
};

export const listBreadcrumb = (section?: string) => {
  return {
    text: i18n.translate('xpack.crossClusterReplication.homeBreadcrumbTitle', {
      defaultMessage: 'Cross-Cluster Replication',
    }),
    href: section || '/',
  };
};

export const addBreadcrumb = {
  text: i18n.translate('xpack.crossClusterReplication.addBreadcrumbTitle', {
    defaultMessage: 'Add',
  }),
};

export const editBreadcrumb = {
  text: i18n.translate('xpack.crossClusterReplication.editBreadcrumbTitle', {
    defaultMessage: 'Edit',
  }),
};

export { setBreadcrumbs };
