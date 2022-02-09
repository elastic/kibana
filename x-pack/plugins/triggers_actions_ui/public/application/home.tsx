/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, useEffect, useMemo } from 'react';
import { Route, RouteComponentProps, Switch } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer, EuiButtonEmpty, EuiPageHeader } from '@elastic/eui';

import { Section, routeToConnectors, routeToRules } from './constants';
import { getAlertingSectionBreadcrumb } from './lib/breadcrumb';
import { getCurrentDocTitle } from './lib/doc_title';
import { hasShowActionsCapability } from './lib/capabilities';

import { HealthCheck } from './components/health_check';
import { HealthContextProvider } from './context/health_context';
import { useKibana } from '../common/lib/kibana';
import { suspendedComponentWithProps } from './lib/suspended_component_with_props';
import { useExperimentalFeatures } from '../common/use_experimental_features';

const ActionsConnectorsList = lazy(
  () => import('./sections/actions_connectors_list/components/actions_connectors_list')
);

const AlertsList = lazy(() => import('./sections/alerts_list/components/alerts_list'));
const RulesListDatagrid = lazy(
  () => import('./sections/alerts_list/components/rules_list_datagrid')
);

export interface MatchParams {
  section: Section;
}

export const TriggersActionsUIHome: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  match: {
    params: { section },
  },
  history,
}) => {
  const {
    chrome,
    application: { capabilities },
    setBreadcrumbs,
    docLinks,
  } = useKibana().services;
  const { rulesListDatagrid } = useExperimentalFeatures();

  const canShowActions = hasShowActionsCapability(capabilities);
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

  const AlertsListComponent = useMemo(
    () => (rulesListDatagrid ? RulesListDatagrid : AlertsList),
    [rulesListDatagrid]
  );

  return (
    <>
      <EuiPageHeader
        bottomBorder
        pageTitle={
          <span data-test-subj="appTitle">
            <FormattedMessage
              id="xpack.triggersActionsUI.home.appTitle"
              defaultMessage="Rules and Connectors"
            />
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
            defaultMessage="Detect conditions using rules, and take actions using connectors."
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
            {canShowActions && (
              <Route
                exact
                path={routeToConnectors}
                component={suspendedComponentWithProps(ActionsConnectorsList, 'xl')}
              />
            )}
            <Route
              exact
              path={routeToRules}
              component={suspendedComponentWithProps(AlertsListComponent, 'xl')}
            />
          </Switch>
        </HealthCheck>
      </HealthContextProvider>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { TriggersActionsUIHome as default };
