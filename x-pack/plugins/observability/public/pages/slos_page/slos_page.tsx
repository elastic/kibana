/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { ObservabilityAppServices } from '../../application/types';
import { paths } from '../../config';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useKibana } from '../../utils/kibana_react';
import { isSloFeatureEnabled } from './helpers';
import PageNotFound from '../404';
import { SLOS_BREADCRUMB_TEXT, SLOS_PAGE_TITLE } from './translations';
import { SloList } from './components/slo_list';

export function SlosPage() {
  const { http } = useKibana<ObservabilityAppServices>().services;
  const { ObservabilityPageTemplate, config } = usePluginContext();

  useBreadcrumbs([
    {
      href: http.basePath.prepend(paths.observability.slos),
      text: SLOS_BREADCRUMB_TEXT,
    },
  ]);

  if (!isSloFeatureEnabled(config)) {
    return <PageNotFound />;
  }

  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle: <>{SLOS_PAGE_TITLE}</>,
        rightSideItems: [],
        bottomBorder: true,
      }}
      data-test-subj="slosPage"
    >
      <SloList />
    </ObservabilityPageTemplate>
  );
}
