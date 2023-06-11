/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import {
  EuiSpacer,
  EuiButtonIcon,
  EuiIcon,
  EuiKeyPadMenu,
  EuiKeyPadMenuItem,
  EuiPopover,
  EuiPopoverTitle,
} from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { useCspIntegrationLink } from '../common/navigation/use_csp_integration_link';
import {
  VULN_MGMT_POLICY_TEMPLATE,
  CSPM_POLICY_TEMPLATE,
  KSPM_POLICY_TEMPLATE,
} from '../../common/constants';
import { cloudPosturePages, findingsNavigation } from '../common/navigation/constants';

export const QuickNav = () => {
  const context = 'vuln';
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const cnvmMgmtIntegrationLink = useCspIntegrationLink(VULN_MGMT_POLICY_TEMPLATE);
  const cspmMgmtIntegrationLink = useCspIntegrationLink(CSPM_POLICY_TEMPLATE);
  const kspmMgmtIntegrationLink = useCspIntegrationLink(KSPM_POLICY_TEMPLATE);
  const history = useHistory();

  const onButtonClick = () => setIsPopoverOpen((isPopoverOpen) => !isPopoverOpen);
  const closePopover = () => setIsPopoverOpen(false);

  const button = (
    <EuiButtonIcon display="fill" iconType={'doubleArrowLeft'} onClick={onButtonClick} size="m" />
  );

  const quickNavList = useMemo(
    () => [
      {
        context: 'Vulnerability Management',
        items: [
          {
            beta: true,
            label: 'Vulnerability Dashboard',
            icon: 'dashboardApp',
            isSelectedUrl: cloudPosturePages.vulnerability_dashboard.path,
            onClick: () => history.push(cloudPosturePages.vulnerability_dashboard.path),
            betaBadgeLabel: 'Beta',
            betaBadgeTooltipContent: 'This module is not GA. Please help us by reporting any bugs.',
            betaBadgeIconType: 'beta',
          },
          {
            label: 'Vulnerabilities Findings',
            icon: 'sqlApp',
            isSelectedUrl: findingsNavigation.vulnerabilities.path,
            onClick: () => history.push(findingsNavigation.vulnerabilities.path),
          },
          {
            label: 'CNVM Integration',
            icon: 'fleetApp',
            disabled: !cnvmMgmtIntegrationLink,
            href: cnvmMgmtIntegrationLink,
          },
        ],
      },
      {
        context: 'Compliance Management',
        items: [
          {
            label: 'Compliance Dashboard',
            icon: 'dashboardApp',
            isSelectedUrl: cloudPosturePages.dashboard.path,
            onClick: () => history.push(cloudPosturePages.dashboard.path),
          },
          {
            label: 'Compliance Findings',
            icon: 'sqlApp',
            isSelectedUrl: findingsNavigation.findings_default.path,
            onClick: () => history.push(findingsNavigation.findings_default.path),
          },
          {
            label: 'Benchmark Rules',
            icon: 'indexPatternApp',
            isSelectedUrl: cloudPosturePages.benchmarks.path,
            onClick: () => history.push(cloudPosturePages.benchmarks.path),
          },
          {
            label: 'CSPM Integration',
            icon: 'fleetApp',
            disabled: !cspmMgmtIntegrationLink,
            href: cspmMgmtIntegrationLink,
          },
          {
            label: 'KSPM Integration',
            icon: 'fleetApp',
            disabled: !kspmMgmtIntegrationLink,
            href: kspmMgmtIntegrationLink,
          },
        ],
      },
    ],
    [cnvmMgmtIntegrationLink, cspmMgmtIntegrationLink, kspmMgmtIntegrationLink, history]
  );

  console.log(history.location);

  return (
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      anchorPosition="leftUp"
    >
      <nav>
        {quickNavList.map((quickNavGroup, i) => (
          <>
            <EuiPopoverTitle>{quickNavGroup.context}</EuiPopoverTitle>
            <EuiKeyPadMenu>
              {quickNavGroup.items.map((keyPadMenuItem) => (
                <EuiKeyPadMenuItem
                  {...keyPadMenuItem}
                  isSelected={history.location.pathname.includes(keyPadMenuItem.isSelectedUrl)}
                >
                  <EuiIcon type={keyPadMenuItem.icon} size="l" />
                </EuiKeyPadMenuItem>
              ))}
            </EuiKeyPadMenu>
            {i !== quickNavList.length - 1 && <EuiSpacer />}
          </>
        ))}
      </nav>
    </EuiPopover>
  );
};
