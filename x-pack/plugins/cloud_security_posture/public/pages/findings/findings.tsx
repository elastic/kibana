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
import { Redirect, useHistory, useLocation, matchPath } from 'react-router-dom';
import { Routes, Route } from '@kbn/shared-ux-router';
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

  const isResourcesVulnerabilitiesPage = matchPath(location.pathname, {
    path: findingsNavigation.resource_vulnerabilities.path,
  })?.isExact;

  const isResourcesFindingsPage = matchPath(location.pathname, {
    path: findingsNavigation.resource_findings.path,
  })?.isExact;

  const showHeader = !isResourcesVulnerabilitiesPage && !isResourcesFindingsPage;

  const isVulnerabilitiesTabSelected = (pathname: string) => {
    return (
      pathname === findingsNavigation.vulnerabilities.path ||
      pathname === findingsNavigation.vulnerabilities_by_resource.path
    );
  };

  return (
    <>
      {showHeader && (
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
              isSelected={isVulnerabilitiesTabSelected(location.pathname)}
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
              isSelected={!isVulnerabilitiesTabSelected(location.pathname)}
            >
              <FormattedMessage
                id="xpack.csp.findings.tabs.misconfigurations"
                defaultMessage="Misconfigurations"
              />
            </EuiTab>
          </EuiTabs>
        </>
      )}
      <Routes>
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
        <Route path={findingsNavigation.findings_by_resource.path} component={Configurations} />
        <Route path={findingsNavigation.vulnerabilities.path} component={Vulnerabilities} />
        <Route
          path={findingsNavigation.vulnerabilities_by_resource.path}
          component={Vulnerabilities}
        />
        {/* Redirect to default findings page if no match */}
        <Route path="*" render={() => <Redirect to={findingsNavigation.findings_default.path} />} />
      </Routes>
    </>
  );
};
