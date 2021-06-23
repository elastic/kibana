/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useContext } from 'react';
import { Route, Switch } from 'react-router-dom';
import useMount from 'react-use/lib/useMount';

import { AlertDropdown } from '../../alerting/log_threshold';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { DocumentTitle } from '../../components/document_title';
import { Header } from '../../components/header';
import { HelpCenterContent } from '../../components/help_center_content';
import { useLogSourceContext } from '../../containers/logs/log_source';
import { RedirectWithQueryParams } from '../../utils/redirect_with_query_params';
import { LogEntryCategoriesPage } from './log_entry_categories';
import { LogEntryRatePage } from './log_entry_rate';
import { LogsSettingsPage } from './settings';
import { StreamPage } from './stream';
import { HeaderMenuPortal } from '../../../../observability/public';
import { HeaderActionMenuContext } from '../../utils/header_action_menu_provider';
import { useLinkProps } from '../../hooks/use_link_props';

export const LogsPageContent: React.FunctionComponent = () => {
  const uiCapabilities = useKibana().services.application?.capabilities;
  const { setHeaderActionMenu } = useContext(HeaderActionMenuContext);

  const { initialize } = useLogSourceContext();

  const kibana = useKibana();

  useMount(() => {
    initialize();
  });

  // !! Need to be kept in sync with the deepLinks in x-pack/plugins/infra/public/plugin.ts
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

  const settingsLinkProps = useLinkProps({
    app: 'logs',
    pathname: 'settings',
  });

  return (
    <>
      <DocumentTitle title={pageTitle} />

      <HelpCenterContent feedbackLink={feedbackLinkUrl} appName={pageTitle} />

      {setHeaderActionMenu && (
        <HeaderMenuPortal setHeaderActionMenu={setHeaderActionMenu}>
          <EuiFlexGroup gutterSize={'xs'} alignItems={'center'} responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty size={'xs'} color={'text'} {...settingsLinkProps}>
                {settingsTabTitle}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <AlertDropdown />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                href={kibana.services?.application?.getUrlForApp(
                  '/home#/tutorial_directory/logging'
                )}
                size="s"
                color="primary"
                iconType="indexOpen"
              >
                {ADD_DATA_LABEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </HeaderMenuPortal>
      )}

      <Header
        breadcrumbs={[
          {
            text: pageTitle,
          },
        ]}
        readOnlyBadge={!uiCapabilities?.logs?.save}
      />
      <Switch>
        <Route path={streamTab.pathname} component={StreamPage} />
        <Route path={anomaliesTab.pathname} component={LogEntryRatePage} />
        <Route path={logCategoriesTab.pathname} component={LogEntryCategoriesPage} />
        <Route path={settingsTab.pathname} component={LogsSettingsPage} />
        <RedirectWithQueryParams from={'/analysis'} to={anomaliesTab.pathname} exact />
        <RedirectWithQueryParams from={'/log-rate'} to={anomaliesTab.pathname} exact />
        <RedirectWithQueryParams from={'/'} to={streamTab.pathname} exact />
      </Switch>
    </>
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
