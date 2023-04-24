/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiBetaBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { Redirect, Switch, useHistory, useLocation } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';
import { Configurations } from '../configurations';
import { cloudPosturePages, findingsNavigation } from '../../common/navigation/constants';
import { Vulnerabilities } from '../vulnerabilities';

export const Findings = () => {
  const history = useHistory();
  const location = useLocation();

  const navigateToVulnerabilitiesTab = () => {
    history.push({ pathname: findingsNavigation.vulnerabilities.path });
  };
  const navigateToConfigurationsTab = () => {
    history.push({ pathname: findingsNavigation.findings_default.path });
  };
  return (
    <>
      <EuiTitle size="l">
        <h1>
          <FormattedMessage id="xpack.csp.findings.title" defaultMessage="Findings" />
        </h1>
      </EuiTitle>
      <EuiSpacer />
      <EuiTabs size="l">
        <EuiTab
          key="vuln_mgmt"
          onClick={navigateToVulnerabilitiesTab}
          isSelected={location.pathname === findingsNavigation.vulnerabilities.path}
        >
          <EuiFlexGroup responsive={false} alignItems="center" direction="row" gutterSize="s">
            <EuiFlexItem grow={false}>
              <FormattedMessage
                id="xpack.csp.findings.tabs.vulnerabilities"
                defaultMessage="Vulnerabilities"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBetaBadge
                css={css`
                  display: block;
                `}
                label="Beta"
                tooltipContent={
                  <FormattedMessage
                    id="xpack.csp.findings.betaLabel"
                    defaultMessage="This functionality is in beta and is subject to change. The design and code is less mature than official generally available features and is being provided as-is with no warranties. Beta features are not subject to the support service level agreement of official generally available features."
                  />
                }
                tooltipPosition="bottom"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiTab>
        <EuiTab
          key="configurations"
          onClick={navigateToConfigurationsTab}
          isSelected={location.pathname !== findingsNavigation.vulnerabilities.path}
        >
          <FormattedMessage
            id="xpack.csp.findings.tabs.configurations"
            defaultMessage="Configurations"
          />
        </EuiTab>
      </EuiTabs>
      <Switch>
        <Route
          exact
          path={cloudPosturePages.findings.path}
          render={() => (
            <Redirect
              to={{
                pathname: findingsNavigation.findings_default.path,
                search: location.search,
              }}
            />
          )}
        />

        <Route path={findingsNavigation.findings_default.path} component={Configurations} />
        <Route path={findingsNavigation.vulnerabilities.path} component={Vulnerabilities} />
        <Route path={findingsNavigation.findings_by_resource.path} component={Configurations} />
        <Route path="*" render={() => <Redirect to={findingsNavigation.findings_default.path} />} />
      </Switch>
    </>
  );
};
