/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useEffect, useState } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTabbedContent,
  EuiTabbedContentTab,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useBreadcrumbs } from '@kbn/observability-shared-plugin/public';

import { useKibana } from '../../utils/kibana_react';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { useLicense } from '../../hooks/use_license';
import { useCapabilities } from '../../hooks/slo/use_capabilities';
import { useFetchSloList } from '../../hooks/slo/use_fetch_slo_list';
import { SloList } from './components/slo_list';
import { AutoRefreshButton } from './components/auto_refresh_button';
import { HeaderTitle } from './components/header_title';
import { FeedbackButton } from '../../components/slo/feedback_button/feedback_button';
import { paths } from '../../config/paths';

const SLO_TAB = 'slo';
const COMPOSITE_SLO_TAB = 'composite_slo';

export function SlosPage() {
  const {
    application: { navigateToUrl },
    http: { basePath },
  } = useKibana().services;
  const { ObservabilityPageTemplate } = usePluginContext();
  const { hasWriteCapabilities } = useCapabilities();
  const { hasAtLeast } = useLicense();

  const { isInitialLoading, isLoading, isError, sloList } = useFetchSloList();
  const total = sloList?.total ?? 0;
  const [isAutoRefreshing, setIsAutoRefreshing] = useState<boolean>(true);

  useBreadcrumbs([
    {
      href: basePath.prepend(paths.observability.slos),
      text: i18n.translate('xpack.observability.breadcrumbs.slosLinkText', {
        defaultMessage: 'SLOs',
      }),
    },
  ]);

  useEffect(() => {
    if ((!isLoading && total === 0) || hasAtLeast('platinum') === false || isError) {
      navigateToUrl(basePath.prepend(paths.observability.slosWelcome));
    }
  }, [basePath, hasAtLeast, isError, isLoading, navigateToUrl, total]);

  const handleClickCreateSlo = () => {
    navigateToUrl(basePath.prepend(paths.observability.sloCreate));
  };

  const handleToggleAutoRefresh = () => {
    setIsAutoRefreshing(!isAutoRefreshing);
  };

  if (isInitialLoading) {
    return null;
  }

  const tabs: EuiTabbedContentTab[] = [
    {
      id: SLO_TAB,
      name: i18n.translate('xpack.observability.slo.sloList.tab.sloLabel', {
        defaultMessage: 'SLOs',
      }),
      'data-test-subj': 'sloTab',
      content: (
        <Fragment>
          <EuiSpacer size="l" />
          <SloList autoRefresh={isAutoRefreshing} />
        </Fragment>
      ),
    },
    {
      id: COMPOSITE_SLO_TAB,
      name: i18n.translate('xpack.observability.slo.sloList.tab.compositeSloLabel', {
        defaultMessage: 'Composite SLOs',
      }),
      'data-test-subj': 'compositeSloTab',
      content: (
        <Fragment>
          <EuiSpacer size="l" />
          <EuiFlexGroup direction="column" gutterSize="xl">
            <EuiFlexItem>
              <EuiText>Composite slo</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </Fragment>
      ),
    },
  ];

  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle: <HeaderTitle />,
        rightSideItems: [
          <EuiButton
            color="primary"
            data-test-subj="slosPageCreateNewSloButton"
            disabled={!hasWriteCapabilities}
            fill
            onClick={handleClickCreateSlo}
          >
            {i18n.translate('xpack.observability.slo.sloList.pageHeader.createNewButtonLabel', {
              defaultMessage: 'Create new SLO',
            })}
          </EuiButton>,
          <AutoRefreshButton
            isAutoRefreshing={isAutoRefreshing}
            onClick={handleToggleAutoRefresh}
          />,
          <FeedbackButton />,
        ],
        bottomBorder: false,
      }}
      data-test-subj="slosPage"
    >
      <EuiTabbedContent
        data-test-subj="sloListTabbedContent"
        tabs={tabs}
        initialSelectedTab={tabs[0]}
      />
    </ObservabilityPageTemplate>
  );
}
