/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { type CustomAssetsAccordionProps, CustomAssetsAccordion } from '@kbn/fleet-plugin/public';
import { i18n } from '@kbn/i18n';
import { useLocation } from 'react-router-dom';
import { EuiSpacer } from '@elastic/eui';
import { useKibana } from '../../common/hooks/use_kibana';
import { benchmarksNavigation, cloudPosturePages } from '../../common/navigation/constants';

const SECURITY_APP_NAME = 'securitySolutionUI';

export const CspCustomAssetsExtension = () => {
  const { application } = useKibana().services;
  const { search } = useLocation();
  const isCNVM = search.includes('vuln_mgmt');

  const viewsCNVM: CustomAssetsAccordionProps['views'] = [
    {
      name: cloudPosturePages.findings.name,
      url: application.getUrlForApp(SECURITY_APP_NAME, {
        path: cloudPosturePages.findings.path + '/vulnerabilities',
      }),
      description: i18n.translate(
        'xpack.csp.createPackagePolicy.customAssetsTab.findingsViewLabel',
        { defaultMessage: 'View Vulnerability Findings ' }
      ),
    },
  ];

  const views: CustomAssetsAccordionProps['views'] = [
    {
      name: cloudPosturePages.dashboard.name,
      url: application.getUrlForApp(SECURITY_APP_NAME, { path: cloudPosturePages.dashboard.path }),
      description: i18n.translate(
        'xpack.csp.createPackagePolicy.customAssetsTab.dashboardViewLabel',
        { defaultMessage: 'View CSP Dashboard' }
      ),
    },
    {
      name: cloudPosturePages.findings.name,
      url: application.getUrlForApp(SECURITY_APP_NAME, {
        path: cloudPosturePages.findings.path,
      }),
      description: i18n.translate(
        'xpack.csp.createPackagePolicy.customAssetsTab.findingsViewLabel',
        { defaultMessage: 'View CSP Findings ' }
      ),
    },
    {
      name: benchmarksNavigation.rules.name,
      url: application.getUrlForApp(SECURITY_APP_NAME, { path: cloudPosturePages.benchmarks.path }),
      description: i18n.translate('xpack.csp.createPackagePolicy.customAssetsTab.rulesViewLabel', {
        defaultMessage: 'View CSP Rules ',
      }),
    },
  ];

  return (
    <>
      {search.length === 0 ? (
        <>
          <CustomAssetsAccordion views={views} initialIsOpen CSPDropdown="Cloud Posture" />
          <EuiSpacer size="m" />
          <CustomAssetsAccordion
            views={viewsCNVM}
            initialIsOpen
            CSPDropdown="Cloud Native Vulnerability Management"
          />
        </>
      ) : (
        <CustomAssetsAccordion views={isCNVM ? viewsCNVM : views} initialIsOpen />
      )}
    </>
  );
};
// eslint-disable-next-line import/no-default-export
export { CspCustomAssetsExtension as default };
