/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { ManagementAppMountParams } from 'src/plugins/management/public';

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
