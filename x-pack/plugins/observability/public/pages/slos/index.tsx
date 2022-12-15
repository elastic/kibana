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
import { SLOS_BREADCRUMB_TEXT, SLOS_PAGE_TITLE } from './translations';
import { useFetchSloList } from '../../hooks/slo/use_fetch_slo_list';
import { SloList } from './components/slo_list';
import { SloListWelcomePrompt } from './components/slo_list_welcome_prompt';
import PageNotFound from '../404';

export function SlosPage() {
  const { http } = useKibana<ObservabilityAppServices>().services;
  const { ObservabilityPageTemplate, config } = usePluginContext();

  const {
    loading,
    sloList: { total },
  } = useFetchSloList({ refetch: false });

  useBreadcrumbs([
    {
      href: http.basePath.prepend(paths.observability.slos),
      text: SLOS_BREADCRUMB_TEXT,
    },
  ]);

  if (!isSloFeatureEnabled(config)) {
    return <PageNotFound />;
  }

  if (loading) {
    return null;
  }

  if (total === 0) {
    return <SloListWelcomePrompt />;
  }

  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle: SLOS_PAGE_TITLE,
        rightSideItems: [],
        bottomBorder: false,
      }}
      data-test-subj="slosPage"
    >
      <SloList />
    </ObservabilityPageTemplate>
  );
}
