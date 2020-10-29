/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { Route, RouteComponentProps, Switch } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiPageBody,
  EuiPageContent,
  EuiPageContentHeader,
  EuiPageContentHeaderSection,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiTitle,
  EuiText,
} from '@elastic/eui';

import { Section, routeToConnectors, routeToAlerts } from './constants';
import { getAlertingSectionBreadcrumb } from './lib/breadcrumb';
import { getCurrentDocTitle } from './lib/doc_title';
import { useAppDependencies } from './app_context';
import { hasShowActionsCapability } from './lib/capabilities';

import { ActionsConnectorsList } from './sections/actions_connectors_list/components/actions_connectors_list';
import { AlertsList } from './sections/alerts_list/components/alerts_list';
import { HealthCheck } from './components/health_check';
import { HealthContextProvider } from './context/health_context';

interface MatchParams {
  section: Section;
}

export const TriggersActionsUIHome: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  match: {
    params: { section },
  },
  history,
}) => {
  const { chrome, capabilities, setBreadcrumbs, docLinks, http } = useAppDependencies();

  const canShowActions = hasShowActionsCapability(capabilities);
  const tabs: Array<{
    id: Section;
    name: React.ReactNode;
  }> = [];

  tabs.push({
    id: 'alerts',
    name: (
      <FormattedMessage id="xpack.triggersActionsUI.home.alertsTabTitle" defaultMessage="Alerts" />
    ),
  });

  if (canShowActions) {
    tabs.push({
      id: 'connectors',
      name: (
        <FormattedMessage
          id="xpack.triggersActionsUI.home.connectorsTabTitle"
          defaultMessage="Connectors"
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
    <EuiPageBody>
      <EuiPageContent>
        <EuiPageContentHeader>
          <EuiPageContentHeaderSection>
            <EuiTitle size="m">
              <h1 data-test-subj="appTitle">
                <FormattedMessage
                  id="xpack.triggersActionsUI.home.appTitle"
                  defaultMessage="Alerts and Actions"
                />
              </h1>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText>
              <p>
                <FormattedMessage
                  id="xpack.triggersActionsUI.home.sectionDescription"
                  defaultMessage="Detect conditions using alerts, and take actions using connectors."
                />
              </p>
            </EuiText>
          </EuiPageContentHeaderSection>
        </EuiPageContentHeader>

        <EuiTabs>
          {tabs.map((tab) => (
            <EuiTab
              onClick={() => onSectionChange(tab.id)}
              isSelected={tab.id === section}
              key={tab.id}
              data-test-subj={`${tab.id}Tab`}
            >
              {tab.name}
            </EuiTab>
          ))}
        </EuiTabs>

        <EuiSpacer size="s" />

        <Switch>
          {canShowActions && (
            <Route
              exact
              path={routeToConnectors}
              component={() => (
                <HealthContextProvider>
                  <HealthCheck docLinks={docLinks} http={http} waitForCheck={true}>
                    <ActionsConnectorsList />
                  </HealthCheck>
                </HealthContextProvider>
              )}
            />
          )}
          <Route
            exact
            path={routeToAlerts}
            component={() => (
              <HealthContextProvider>
                <HealthCheck docLinks={docLinks} http={http} inFlyout={true} waitForCheck={true}>
                  <AlertsList />
                </HealthCheck>
              </HealthContextProvider>
            )}
          />
        </Switch>
      </EuiPageContent>
    </EuiPageBody>
  );
};

// eslint-disable-next-line import/no-default-export
export { TriggersActionsUIHome as default };
