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
  EuiBetaBadge,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { Section, routeToConnectors, routeToAlerts } from './constants';
import { getCurrentBreadcrumb } from './lib/breadcrumb';
import { getCurrentDocTitle } from './lib/doc_title';
import { useAppDependencies } from './app_context';
import { hasShowActionsCapability, hasShowAlertsCapability } from './lib/capabilities';

import { ActionsConnectorsList } from './sections/actions_connectors_list/components/actions_connectors_list';
import { AlertsList } from './sections/alerts_list/components/alerts_list';
import { PLUGIN } from './constants/plugin';
import { HealthCheck } from './components/health_check';

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
  const canShowAlerts = hasShowAlertsCapability(capabilities);
  const tabs: Array<{
    id: Section;
    name: React.ReactNode;
  }> = [];

  if (canShowAlerts) {
    tabs.push({
      id: 'alerts',
      name: (
        <FormattedMessage
          id="xpack.triggersActionsUI.home.alertsTabTitle"
          defaultMessage="Alerts"
        />
      ),
    });
  }

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
    setBreadcrumbs([getCurrentBreadcrumb(section || 'home')]);
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
                &emsp;
                <EuiBetaBadge
                  label="Beta"
                  tooltipContent={i18n.translate(
                    'xpack.triggersActionsUI.home.betaBadgeTooltipContent',
                    {
                      defaultMessage:
                        '{pluginName} is in beta and is subject to change. The design and code is less mature than official GA features and is being provided as-is with no warranties. Beta features are not subject to the support SLA of official GA features.',
                      values: {
                        pluginName: PLUGIN.getI18nName(i18n),
                      },
                    }
                  )}
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
                <HealthCheck docLinks={docLinks} http={http}>
                  <ActionsConnectorsList />
                </HealthCheck>
              )}
            />
          )}
          {canShowAlerts && (
            <Route
              exact
              path={routeToAlerts}
              component={() => (
                <HealthCheck docLinks={docLinks} http={http}>
                  <AlertsList />
                </HealthCheck>
              )}
            />
          )}
        </Switch>
      </EuiPageContent>
    </EuiPageBody>
  );
};

// eslint-disable-next-line import/no-default-export
export { TriggersActionsUIHome as default };
