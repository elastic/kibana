/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { RouteComponentProps } from 'react-router-dom';
import React from 'react';
import { renderAsRedirectTo } from '../../routing/render_as_redirect';
import { ApmMainTemplate } from '../../routing/templates/apm_main_template';
import { ServiceInventory } from '../../app/service_inventory';

const pageTitle = i18n.translate('xpack.apm.views.serviceInventory.title', {
  defaultMessage: 'Services',
});

export const serviceInventoryRoutes = [
  {
    exact: true,
    path: '/',
    render: renderAsRedirectTo('/services'),
    breadcrumb: 'APM',
  },

  {
    exact: true,
    path: '/services', // !! Need to be kept in sync with the deepLinks in x-pack/plugins/apm/public/plugin.ts
    component: ServiceInventoryView,
    breadcrumb: pageTitle,
  },
];

function ServiceInventoryView(props: RouteComponentProps) {
  return (
    <ApmMainTemplate pageTitle={pageTitle}>
      <ServiceInventory />
    </ApmMainTemplate>
  );
}
