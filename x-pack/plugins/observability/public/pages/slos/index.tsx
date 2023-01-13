/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { ObservabilityAppServices } from '../../application/types';
import { paths } from '../../config';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useKibana } from '../../utils/kibana_react';
import { isSloFeatureEnabled } from './helpers/is_slo_feature_enabled';
import { SLOS_BREADCRUMB_TEXT, SLOS_PAGE_TITLE } from './translations';
import { useFetchSloList } from '../../hooks/slo/use_fetch_slo_list';
import { SloList } from './components/slo_list';
import { SloListWelcomePrompt } from './components/slo_list_welcome_prompt';
import PageNotFound from '../404';

export function SlosPage() {
  const {
    application: { navigateToUrl },
    http: { basePath },
  } = useKibana<ObservabilityAppServices>().services;
  const { ObservabilityPageTemplate, config } = usePluginContext();

  const {
    loading,
    sloList: { total },
  } = useFetchSloList({ refetch: false });

  useBreadcrumbs([
    {
      href: basePath.prepend(paths.observability.slos),
      text: SLOS_BREADCRUMB_TEXT,
    },
  ]);

  const handleClickCreateSlo = () => {
    navigateToUrl(basePath.prepend(paths.observability.sloCreate));
  };

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
        rightSideItems: [
          <EuiButton color="primary" fill onClick={handleClickCreateSlo}>
            {i18n.translate('xpack.observability.slos.sloList.pageHeader.createNewButtonLabel', {
              defaultMessage: 'Create new SLO',
            })}
          </EuiButton>,
        ],
        bottomBorder: false,
      }}
      data-test-subj="slosPage"
    >
      <SloList />
    </ObservabilityPageTemplate>
  );
}
