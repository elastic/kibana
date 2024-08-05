/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, useCallback, useEffect, useState } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { Routes, Route } from '@kbn/shared-ux-router';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexItem,
  EuiPageHeader,
  EuiPageTemplate,
  EuiSpacer,
} from '@elastic/eui';
import { routeToConnectorEdit, routeToConnectors, routeToLogs, Section } from '../../../constants';
import { getAlertingSectionBreadcrumb } from '../../../lib/breadcrumb';
import { getCurrentDocTitle } from '../../../lib/doc_title';
import { suspendedComponentWithProps } from '../../../lib/suspended_component_with_props';
import { HealthContextProvider } from '../../../context/health_context';
import { HealthCheck } from '../../../components/health_check';
import { useKibana } from '../../../../common/lib/kibana';
import { CreateConnectorFlyout } from '../../action_connector_form/create_connector_flyout';
import ConnectorEventLogListTableWithApi from './actions_connectors_event_log_list_table';

const ConnectorsList = lazy(() => import('./actions_connectors_list'));

export interface MatchParams {
  section: Section;
}

export const ActionsConnectorsHome: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  match: {
    params: { section },
  },
  history,
}) => {
  const { chrome, setBreadcrumbs, docLinks, actionTypeRegistry } = useKibana().services;

  const [isCreateConnectorFlyoutVisible, setIsCreateConnectorFlyoutVisible] =
    useState<boolean>(false);

  const tabs: Array<{
    id: Section;
    name: React.ReactNode;
  }> = [];
  tabs.push({
    id: 'connectors',
    name: (
      <FormattedMessage
        id="xpack.triggersActionsUI.connectors.home.connectorsTabTitle"
        defaultMessage="Connectors"
      />
    ),
  });
  tabs.push({
    id: 'logs',
    name: (
      <FormattedMessage
        id="xpack.triggersActionsUI.connectors.home.logsTabTitle"
        defaultMessage="Logs"
      />
    ),
  });

  const onSectionChange = (newSection: Section) => {
    history.push(`/${newSection}`);
  };

  // Set breadcrumb and page title
  useEffect(() => {
    setBreadcrumbs([getAlertingSectionBreadcrumb(section || 'connectors')]);
    chrome.docTitle.change(getCurrentDocTitle(section || 'connectors'));
  }, [section, chrome, setBreadcrumbs]);

  const renderLogsList = useCallback(() => {
    return (
      <EuiPageTemplate.Section grow={false} paddingSize="none">
        {suspendedComponentWithProps(
          ConnectorEventLogListTableWithApi,
          'xl'
        )({
          refreshToken: 0,
          initialPageSize: 50,
          hasConnectorNames: true,
          hasAllSpaceSwitch: true,
        })}
      </EuiPageTemplate.Section>
    );
  }, []);

  return (
    <>
      <EuiPageHeader
        bottomBorder
        paddingSize="none"
        pageTitle={i18n.translate('xpack.triggersActionsUI.connectors.home.appTitle', {
          defaultMessage: 'Connectors',
        })}
        description={i18n.translate('xpack.triggersActionsUI.connectors.home.description', {
          defaultMessage: 'Connect third-party software with your alerting data.',
        })}
        rightSideItems={[
          <EuiFlexItem>
            <EuiButton
              data-test-subj="createConnectorButton"
              fill
              iconType="plusInCircle"
              iconSide="left"
              onClick={() => setIsCreateConnectorFlyoutVisible(true)}
              isLoading={false}
            >
              {i18n.translate('xpack.triggersActionsUI.connectors.home.createConnector', {
                defaultMessage: 'Create connector',
              })}
            </EuiButton>
          </EuiFlexItem>,
          <EuiButtonEmpty
            data-test-subj="documentationButton"
            key="documentation-button"
            target="_blank"
            href={docLinks.links.alerting.actionTypes}
            iconType="help"
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.connectors.home.documentationButtonLabel"
              defaultMessage="Documentation"
            />
          </EuiButtonEmpty>,
        ]}
        tabs={tabs.map((tab) => ({
          label: tab.name,
          onClick: () => onSectionChange(tab.id),
          isSelected: tab.id === section,
          key: tab.id,
          'data-test-subj': `${tab.id}Tab`,
        }))}
      />

      {isCreateConnectorFlyoutVisible && (
        <CreateConnectorFlyout
          onClose={() => {
            setIsCreateConnectorFlyoutVisible(false);
          }}
          // onTestConnector={(connector) => editItem(connector, EditConnectorTabs.Test)}
          onConnectorCreated={() => {}}
          actionTypeRegistry={actionTypeRegistry}
        />
      )}

      <EuiSpacer size="l" />

      <HealthContextProvider>
        <HealthCheck waitForCheck={true}>
          <Routes>
            <Route exact path={routeToLogs} component={renderLogsList} />
            <Route
              exact
              path={[routeToConnectors, routeToConnectorEdit]}
              component={suspendedComponentWithProps(ConnectorsList, 'xl')}
            />
          </Routes>
        </HealthCheck>
      </HealthContextProvider>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { ActionsConnectorsHome as default };
