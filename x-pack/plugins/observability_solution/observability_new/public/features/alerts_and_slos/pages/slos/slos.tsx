/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { i18n } from '@kbn/i18n';
import { useObservabilityRouter } from '../../../../hooks/use_router';
import ObservabilityPageTemplate from '../../../../components/page_template/page_template';
import { useBreadcrumbs } from '../../../../hooks/use_breadcrumbs';
import { FeedbackButton } from './components/common/feedback_button';
import { CreateSloBtn } from './components/common/create_slo_btn';
import { SloListSearchBar } from './components/slo_list_search_bar';
import { useLicense } from '../../hooks/use_license';
import { useFetchSloList } from '../../hooks/slo/use_fetch_slo_list';
import { SloList } from './components/slo_list';
import { HeaderMenu } from '../overview/components/header_menu/header_menu';
import { SloOutdatedCallout } from '../../components/slo/slo_outdated_callout';

export const SLO_PAGE_ID = 'slo-page-container';

export function SlosPage() {
  const { link, push } = useObservabilityRouter();

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
      href: link('/slos'),
      text: i18n.translate('xpack.observability.breadcrumbs.slosLinkText', {
        defaultMessage: 'SLOs',
      }),
      deepLinkId: 'observability-new:slos',
    },
  ]);

  useEffect(() => {
    if ((!isLoading && total === 0) || hasAtLeast('platinum') === false || isError) {
      push('/slos/welcome', { path: '', query: '' });
    }
  }, [hasAtLeast, isError, isLoading, push, total]);

  return (
    <ObservabilityPageTemplate
      data-test-subj="slosPage"
      pageHeader={{
        pageTitle: i18n.translate('xpack.observability.slos.heading', {
          defaultMessage: 'SLOs',
        }),
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
