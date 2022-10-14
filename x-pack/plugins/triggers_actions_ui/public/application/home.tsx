/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, useEffect } from 'react';
import { Route, RouteComponentProps, Switch, Redirect } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer, EuiButtonEmpty, EuiPageHeader } from '@elastic/eui';

import { getIsExperimentalFeatureEnabled } from '../common/get_experimental_features';
import { Section, routeToRules, routeToInternalAlerts, routeToLogs } from './constants';
import { getAlertingSectionBreadcrumb } from './lib/breadcrumb';
import { getCurrentDocTitle } from './lib/doc_title';

import { HealthCheck } from './components/health_check';
import { HealthContextProvider } from './context/health_context';
import { useKibana } from '../common/lib/kibana';
import { suspendedComponentWithProps } from './lib/suspended_component_with_props';

const RulesList = lazy(() => import('./sections/rules_list/components/rules_list'));
const LogsList = lazy(() => import('./sections/logs_list/components/logs_list'));
const AlertsPage = lazy(() => import('./sections/alerts_table/alerts_page'));

export interface MatchParams {
  section: Section;
}

export const TriggersActionsUIHome: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  match: {
    params: { section },
  },
  history,
}) => {
  const { chrome, setBreadcrumbs, docLinks } = useKibana().services;
  const isInternalAlertsTableEnabled = getIsExperimentalFeatureEnabled('internalAlertsTable');

  const tabs: Array<{
    id: Section;
    name: React.ReactNode;
  }> = [];

  tabs.push({
    id: 'rules',
    name: (
      <FormattedMessage id="xpack.triggersActionsUI.home.rulesTabTitle" defaultMessage="Rules" />
    ),
  });

  tabs.push({
    id: 'logs',
    name: <FormattedMessage id="xpack.triggersActionsUI.home.logsTabTitle" defaultMessage="Logs" />,
  });

  if (isInternalAlertsTableEnabled) {
    tabs.push({
      id: 'alerts',
      name: (
        <FormattedMessage
          id="xpack.triggersActionsUI.home.TabTitle"
          defaultMessage="Alerts (Internal use only)"
        />
      ),
    });
  }

  const onSectionChange = (newSection: Section) => {
    history.push(`/${newSection}`);
  };

  // Set breadcrumb and page title
  useEffect(() => {
    setBreadcrumbs([getAlertingSectionBreadcrumb(section || 'home')]);
    chrome.docTitle.change(getCurrentDocTitle(section || 'home'));
  }, [section, chrome, setBreadcrumbs]);

  return (
    <>
      <EuiPageHeader
        bottomBorder
        pageTitle={
          <span data-test-subj="appTitle">
            <FormattedMessage id="xpack.triggersActionsUI.home.appTitle" defaultMessage="Rules" />
          </span>
        }
        rightSideItems={[
          <EuiButtonEmpty
            href={docLinks.links.alerting.guide}
            target="_blank"
            iconType="help"
            data-test-subj="documentationLink"
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.home.docsLinkText"
              defaultMessage="Documentation"
            />
          </EuiButtonEmpty>,
        ]}
        description={
          <FormattedMessage
            id="xpack.triggersActionsUI.home.sectionDescription"
            defaultMessage="Detect conditions using rules."
          />
        }
        tabs={tabs.map((tab) => ({
          label: tab.name,
          onClick: () => onSectionChange(tab.id),
          isSelected: tab.id === section,
          key: tab.id,
          'data-test-subj': `${tab.id}Tab`,
        }))}
      />

      <EuiSpacer size="l" />

      <HealthContextProvider>
        <HealthCheck waitForCheck={true}>
          <Switch>
            <Route
              exact
              path={routeToLogs}
              component={suspendedComponentWithProps(LogsList, 'xl')}
            />
            <Route
              exact
              path={routeToRules}
              component={suspendedComponentWithProps(RulesList, 'xl')}
            />
            {isInternalAlertsTableEnabled ? (
              <Route
                exact
                path={routeToInternalAlerts}
                component={suspendedComponentWithProps(AlertsPage, 'xl')}
              />
            ) : (
              <Redirect to={routeToRules} />
            )}
          </Switch>
        </HealthCheck>
      </HealthContextProvider>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { TriggersActionsUIHome as default };
