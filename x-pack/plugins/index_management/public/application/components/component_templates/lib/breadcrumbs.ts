/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ManagementAppMountParams } from '@kbn/management-plugin/public';

export const getBreadcrumbs = (setBreadcrumbs: ManagementAppMountParams['setBreadcrumbs']) => {
  const baseBreadcrumbs = [
    {
      text: i18n.translate('xpack.idxMgmt.componentTemplate.breadcrumb.homeLabel', {
        defaultMessage: 'Index Management',
      }),
      href: '/',
    },
    {
      text: i18n.translate('xpack.idxMgmt.componentTemplate.breadcrumb.componentTemplatesLabel', {
        defaultMessage: 'Component templates',
      }),
      href: '/component_templates',
    },
  ];

  const setCreateBreadcrumbs = () => {
    const createBreadcrumbs = [
      ...baseBreadcrumbs,
      {
        text: i18n.translate(
          'xpack.idxMgmt.componentTemplate.breadcrumb.createComponentTemplateLabel',
          {
            defaultMessage: 'Create component template',
          }
        ),
      },
    ];

    return setBreadcrumbs(createBreadcrumbs);
  };

  const setEditBreadcrumbs = () => {
    const editBreadcrumbs = [
      ...baseBreadcrumbs,
      {
        text: i18n.translate(
          'xpack.idxMgmt.componentTemplate.breadcrumb.editComponentTemplateLabel',
          {
            defaultMessage: 'Edit component template',
          }
        ),
      },
    ];

    return setBreadcrumbs(editBreadcrumbs);
  };

  return {
    setCreateBreadcrumbs,
    setEditBreadcrumbs,
  };
};
