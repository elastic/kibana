/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { Route, Switch } from 'react-router-dom';

import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { DocumentTitle } from '../../components/document_title';
import { Header } from '../../components/header';
import { HelpCenterContent } from '../../components/help_center_content';
import { AppNavigation } from '../../components/navigation/app_navigation';
import { RoutedTabs } from '../../components/navigation/routed_tabs';
import { ColumnarPage } from '../../components/page';
import { useLogAnalysisCapabilitiesContext } from '../../containers/logs/log_analysis';
import { RedirectWithQueryParams } from '../../utils/redirect_with_query_params';
import { LogEntryCategoriesPage } from './log_entry_categories';
import { LogEntryRatePage } from './log_entry_rate';
import { LogsSettingsPage } from './settings';
import { StreamPage } from './stream';

export const LogsPageContent: React.FunctionComponent = () => {
  const uiCapabilities = useKibana().services.application?.capabilities;
  const logAnalysisCapabilities = useLogAnalysisCapabilitiesContext();

  const streamTab = {
    app: 'logs',
    title: streamTabTitle,
    pathname: '/stream',
  };

  const logRateTab = {
    app: 'logs',
    title: logRateTabTitle,
    pathname: '/log-rate',
  };

  const logCategoriesTab = {
    app: 'logs',
    title: logCategoriesTabTitle,
    pathname: '/log-categories',
  };

  const settingsTab = {
    app: 'logs',
    title: settingsTabTitle,
    pathname: '/settings',
  };

  return (
    <ColumnarPage>
      <DocumentTitle title={pageTitle} />

      <HelpCenterContent feedbackLink={feedbackLinkUrl} appName={pageTitle} />

      <Header
        breadcrumbs={[
          {
            text: pageTitle,
          },
        ]}
        readOnlyBadge={!uiCapabilities?.logs?.save}
      />
      <AppNavigation aria-label={pageTitle}>
        <RoutedTabs
          tabs={
            logAnalysisCapabilities.hasLogAnalysisCapabilites
              ? [streamTab, logRateTab, logCategoriesTab, settingsTab]
              : [streamTab, settingsTab]
          }
        />
      </AppNavigation>
      <Switch>
        <Route path={streamTab.pathname} component={StreamPage} />
        <Route path={logRateTab.pathname} component={LogEntryRatePage} />
        <Route path={logCategoriesTab.pathname} component={LogEntryCategoriesPage} />
        <Route path={settingsTab.pathname} component={LogsSettingsPage} />
        <RedirectWithQueryParams from={'/analysis'} to={logRateTab.pathname} exact />
      </Switch>
    </ColumnarPage>
  );
};

const pageTitle = i18n.translate('xpack.infra.header.logsTitle', {
  defaultMessage: 'Logs',
});

const streamTabTitle = i18n.translate('xpack.infra.logs.index.streamTabTitle', {
  defaultMessage: 'Stream',
});

const logRateTabTitle = i18n.translate('xpack.infra.logs.index.logRateBetaBadgeTitle', {
  defaultMessage: 'Log Rate',
});

const logCategoriesTabTitle = i18n.translate('xpack.infra.logs.index.logCategoriesBetaBadgeTitle', {
  defaultMessage: 'Categories',
});

const settingsTabTitle = i18n.translate('xpack.infra.logs.index.settingsTabTitle', {
  defaultMessage: 'Settings',
});

const feedbackLinkUrl = 'https://discuss.elastic.co/c/logs';
