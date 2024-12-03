/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';
import { SLOsOverview } from './components/slos_overview/slos_overview';
import { paths } from '../../../common/locators/paths';
import { HeaderMenu } from '../../components/header_menu/header_menu';
import { SloOutdatedCallout } from '../../components/slo/slo_outdated_callout';
import { useFetchSloList } from '../../hooks/use_fetch_slo_list';
import { useLicense } from '../../hooks/use_license';
import { usePermissions } from '../../hooks/use_permissions';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useKibana } from '../../hooks/use_kibana';
import { CreateSloBtn } from './components/common/create_slo_btn';
import { FeedbackButton } from './components/common/feedback_button';
import { SloList } from './components/slo_list';
import { SloListSearchBar } from './components/slo_list_search_bar';

export const SLO_PAGE_ID = 'slo-page-container';

export function SlosPage() {
  const {
    application: { navigateToUrl },
    http: { basePath },
    serverless,
  } = useKibana().services;
  const { ObservabilityPageTemplate } = usePluginContext();
  const { hasAtLeast } = useLicense();
  const { data: permissions } = usePermissions();

  const { isLoading, isError, data: sloList } = useFetchSloList({ perPage: 0 });
  const { total } = sloList ?? { total: 0 };

  useBreadcrumbs(
    [
      {
        href: basePath.prepend(paths.slos),
        text: i18n.translate('xpack.slo.breadcrumbs.slosLinkText', {
          defaultMessage: 'SLOs',
        }),
        deepLinkId: 'slo',
      },
    ],
    { serverless }
  );

  useEffect(() => {
    if ((!isLoading && total === 0) || hasAtLeast('platinum') === false || isError) {
      navigateToUrl(basePath.prepend(paths.slosWelcome));
    }

    if (permissions?.hasAllReadRequested === false) {
      navigateToUrl(basePath.prepend(paths.slosWelcome));
    }
  }, [basePath, hasAtLeast, isError, isLoading, navigateToUrl, total, permissions]);

  return (
    <ObservabilityPageTemplate
      data-test-subj="slosPage"
      pageHeader={{
        pageTitle: i18n.translate('xpack.slo.slosPage.', { defaultMessage: 'SLOs' }),
        rightSideItems: [<CreateSloBtn />, <FeedbackButton />],
      }}
      topSearchBar={<SloListSearchBar />}
    >
      <HeaderMenu />
      <SloOutdatedCallout />
      <SLOsOverview />
      <EuiSpacer size="m" />
      <SloList />
    </ObservabilityPageTemplate>
  );
}
