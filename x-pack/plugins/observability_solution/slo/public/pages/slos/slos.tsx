/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';

import { i18n } from '@kbn/i18n';
import { HeaderMenu } from '../../components/header_menu/header_menu';
import { useKibana } from '../../utils/kibana_react';
import { FeedbackButton } from './components/common/feedback_button';
import { CreateSloBtn } from './components/common/create_slo_btn';
import { SloListSearchBar } from './components/slo_list_search_bar';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useLicense } from '../../hooks/use_license';
import { useFetchSloList } from '../../hooks/use_fetch_slo_list';
import { SloList } from './components/slo_list';
import { paths } from '../../../common/locators/paths';
import { SloOutdatedCallout } from '../../components/slo/slo_outdated_callout';

export const SLO_PAGE_ID = 'slo-page-container';

export function SlosPage() {
  const {
    application: { navigateToUrl },
    http: { basePath },
  } = useKibana().services;
  const { ObservabilityPageTemplate } = usePluginContext();
  const { hasAtLeast } = useLicense();

  const {
    isLoading,
    isError,
    data: sloList,
  } = useFetchSloList({
    perPage: 0,
  });
  const { total } = sloList ?? { total: 0 };

  useBreadcrumbs([
    {
      href: basePath.prepend(paths.slos),
      text: i18n.translate('xpack.slo.breadcrumbs.slosLinkText', {
        defaultMessage: 'SLOs',
      }),
      deepLinkId: 'slo',
    },
  ]);

  useEffect(() => {
    if ((!isLoading && total === 0) || hasAtLeast('platinum') === false || isError) {
      navigateToUrl(basePath.prepend(paths.slosWelcome));
    }
  }, [basePath, hasAtLeast, isError, isLoading, navigateToUrl, total]);

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
      <SloList />
    </ObservabilityPageTemplate>
  );
}
