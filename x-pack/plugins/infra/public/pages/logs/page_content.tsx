/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Route, Switch } from 'react-router-dom';
import { useMount } from 'react-use';

import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { DocumentTitle } from '../../components/document_title';
import { Header } from '../../components/header';
import { HelpCenterContent } from '../../components/help_center_content';
import { AppNavigation } from '../../components/navigation/app_navigation';
import { RoutedTabs } from '../../components/navigation/routed_tabs';
import { ColumnarPage } from '../../components/page';
import { useLogSourceContext } from '../../containers/logs/log_source';
import { RedirectWithQueryParams } from '../../utils/redirect_with_query_params';
import { LogEntryCategoriesPage } from './log_entry_categories';
import { LogEntryRatePage } from './log_entry_rate';
import { LogsSettingsPage } from './settings';
import { StreamPage } from './stream';
import { AlertDropdown } from '../../components/alerting/logs/alert_dropdown';

export const LogsPageContent: React.FunctionComponent = () => {
  const uiCapabilities = useKibana().services.application?.capabilities;

  const { initialize } = useLogSourceContext();

  const kibana = useKibana();

  useMount(() => {
    initialize();
  });

  const streamTab = {
    app: 'logs',
    title: streamTabTitle,
    pathname: '/stream',
  };

  const anomaliesTab = {
    app: 'logs',
    title: anomaliesTabTitle,
    pathname: '/anomalies',
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
        <EuiFlexGroup gutterSize={'none'} alignItems={'center'}>
          <EuiFlexItem>
            <RoutedTabs tabs={[streamTab, anomaliesTab, logCategoriesTab, settingsTab]} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <AlertDropdown />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              href={kibana.services?.application?.getUrlForApp('/home#/tutorial_directory/logging')}
              size="s"
              color="primary"
              iconType="plusInCircle"
            >
              {ADD_DATA_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </AppNavigation>
      <Switch>
        <Route path={streamTab.pathname} component={StreamPage} />
        <Route path={anomaliesTab.pathname} component={LogEntryRatePage} />
        <Route path={logCategoriesTab.pathname} component={LogEntryCategoriesPage} />
        <Route path={settingsTab.pathname} component={LogsSettingsPage} />
        <RedirectWithQueryParams from={'/analysis'} to={anomaliesTab.pathname} exact />
        <RedirectWithQueryParams from={'/log-rate'} to={anomaliesTab.pathname} exact />
        <RedirectWithQueryParams from={'/'} to={streamTab.pathname} exact />
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

const anomaliesTabTitle = i18n.translate('xpack.infra.logs.index.anomaliesTabTitle', {
  defaultMessage: 'Anomalies',
});

const logCategoriesTabTitle = i18n.translate('xpack.infra.logs.index.logCategoriesBetaBadgeTitle', {
  defaultMessage: 'Categories',
});

const settingsTabTitle = i18n.translate('xpack.infra.logs.index.settingsTabTitle', {
  defaultMessage: 'Settings',
});

const feedbackLinkUrl = 'https://discuss.elastic.co/c/logs';

const ADD_DATA_LABEL = i18n.translate('xpack.infra.logsHeaderAddDataButtonLabel', {
  defaultMessage: 'Add data',
});
