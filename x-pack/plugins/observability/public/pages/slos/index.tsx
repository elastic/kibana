/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useKibana } from '../../utils/kibana_react';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useLicense } from '../../hooks/use_license';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useCapabilities } from '../../hooks/slo/use_capabilities';
import { useFetchSloList } from '../../hooks/slo/use_fetch_slo_list';
import { SloList } from './components/slo_list';
import { SloListWelcomePrompt } from './components/slo_list_welcome_prompt';
import { AutoRefreshButton } from './components/auto_refresh_button';
import PageNotFound from '../404';
import { paths } from '../../config';
import { isSloFeatureEnabled } from './helpers/is_slo_feature_enabled';
import type { ObservabilityAppServices } from '../../application/types';

export function SlosPage() {
  const {
    application: { navigateToUrl },
    http: { basePath },
  } = useKibana<ObservabilityAppServices>().services;
  const { ObservabilityPageTemplate, config } = usePluginContext();
  const { hasWriteCapabilities } = useCapabilities();
  const { hasAtLeast } = useLicense();

  const { isInitialLoading, isLoading, sloList } = useFetchSloList();

  const { total } = sloList || {};

  const [isAutoRefreshing, setIsAutoRefreshing] = useState<boolean>(true);

  useBreadcrumbs([
    {
      href: basePath.prepend(paths.observability.slos),
      text: i18n.translate('xpack.observability.breadcrumbs.slosLinkText', {
        defaultMessage: 'SLOs',
      }),
    },
  ]);

  const handleClickCreateSlo = () => {
    navigateToUrl(basePath.prepend(paths.observability.sloCreate));
  };

  const handleToggleAutoRefresh = () => {
    setIsAutoRefreshing(!isAutoRefreshing);
  };

  if (!isSloFeatureEnabled(config)) {
    return <PageNotFound />;
  }

  if (isInitialLoading) {
    return null;
  }

  if ((!isLoading && total === 0) || !hasAtLeast('platinum')) {
    return <SloListWelcomePrompt />;
  }

  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle: i18n.translate('xpack.observability.slosPageTitle', {
          defaultMessage: 'SLOs',
        }),
        rightSideItems: [
          <EuiButton
            color="primary"
            data-test-subj="slosPage-createNewSloButton"
            disabled={!hasWriteCapabilities}
            fill
            onClick={handleClickCreateSlo}
          >
            {i18n.translate('xpack.observability.slos.sloList.pageHeader.createNewButtonLabel', {
              defaultMessage: 'Create new SLO',
            })}
          </EuiButton>,
          <AutoRefreshButton
            isAutoRefreshing={isAutoRefreshing}
            onClick={handleToggleAutoRefresh}
          />,
        ],
        bottomBorder: false,
      }}
      data-test-subj="slosPage"
    >
      <SloList autoRefresh={isAutoRefreshing} />
    </ObservabilityPageTemplate>
  );
}
