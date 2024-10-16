/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { EuiSpacer, EuiTab, EuiTabs, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { Redirect, useHistory, useLocation, matchPath } from 'react-router-dom';
import { Routes, Route } from '@kbn/shared-ux-router';
import { findingsNavigation } from '@kbn/cloud-security-posture';
import { useCspSetupStatusApi } from '@kbn/cloud-security-posture/src/hooks/use_csp_setup_status_api';
import { Configurations } from '../configurations';
import { cloudPosturePages } from '../../common/navigation/constants';
import { LOCAL_STORAGE_FINDINGS_LAST_SELECTED_TAB_KEY } from '../../common/constants';
import { VULNERABILITIES_INDEX_NAME, FINDINGS_INDEX_NAME } from '../../../common/constants';
import { getStatusForIndexName } from '../../../common/utils/helpers';
import { Vulnerabilities } from '../vulnerabilities';

type FindingsTabKey = 'vuln_mgmt' | 'configurations';

const FindingsTabRedirecter = ({ lastTabSelected }: { lastTabSelected?: FindingsTabKey }) => {
  const location = useLocation();
  const getSetupStatus = useCspSetupStatusApi();

  if (!getSetupStatus.data) {
    return null;
  }

  const vulnStatus = getStatusForIndexName(VULNERABILITIES_INDEX_NAME, getSetupStatus.data);
  const findingsStatus = getStatusForIndexName(FINDINGS_INDEX_NAME, getSetupStatus.data);
  const hasVulnerabilities = vulnStatus === 'not-empty';
  const hasFindings = findingsStatus === 'not-empty';

  // if the user has not yet made a tab selection
  // switch to misconfigurations page if there are misconfigurations, and no vulnerabilities
  const redirectToMisconfigurationsTab =
    lastTabSelected === 'configurations' ||
    (!lastTabSelected && !hasVulnerabilities && hasFindings);

  if (redirectToMisconfigurationsTab) {
    return (
      <Redirect
        to={{ search: location.search, pathname: findingsNavigation.findings_default.path }}
      />
    );
  }

  // otherwise stay on the misconfigurations tab, since it's the first one.
  return (
    <Redirect
      to={{ search: location.search, pathname: findingsNavigation.findings_default.path }}
    />
  );
};

export const Findings = () => {
  const history = useHistory();
  const location = useLocation();

  // restore the users most recent tab selection
  const [lastTabSelected, setLastTabSelected] = useLocalStorage<FindingsTabKey>(
    LOCAL_STORAGE_FINDINGS_LAST_SELECTED_TAB_KEY
  );

  const navigateToVulnerabilitiesTab = () => {
    setLastTabSelected('vuln_mgmt');
    history.push({ pathname: findingsNavigation.vulnerabilities.path });
  };
  const navigateToConfigurationsTab = () => {
    setLastTabSelected('configurations');
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
              key="configurations"
              onClick={navigateToConfigurationsTab}
              isSelected={!isVulnerabilitiesTabSelected(location.pathname)}
            >
              <FormattedMessage
                id="xpack.csp.findings.tabs.misconfigurations"
                defaultMessage="Misconfigurations"
              />
            </EuiTab>
            <EuiTab
              key="vuln_mgmt"
              onClick={navigateToVulnerabilitiesTab}
              isSelected={isVulnerabilitiesTabSelected(location.pathname)}
            >
              <FormattedMessage
                id="xpack.csp.findings.tabs.vulnerabilities"
                defaultMessage="Vulnerabilities"
              />
            </EuiTab>
          </EuiTabs>
        </>
      )}
      <Routes>
        <Route
          exact
          path={cloudPosturePages.findings.path}
          render={() => <FindingsTabRedirecter lastTabSelected={lastTabSelected} />}
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
