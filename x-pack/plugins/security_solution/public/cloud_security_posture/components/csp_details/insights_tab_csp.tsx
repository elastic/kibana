/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useState } from 'react';
import type { EuiButtonGroupOptionProps } from '@elastic/eui';
import { EuiButtonGroup, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FlyoutPanelProps, PanelPath } from '@kbn/expandable-flyout';
import { useExpandableFlyoutState } from '@kbn/expandable-flyout';
import { i18n } from '@kbn/i18n';
import { CspInsightLeftPanelSubTab } from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import { MisconfigurationFindingsDetailsTable } from './misconfiguration_findings_details_table';
import { VulnerabilitiesFindingsDetailsTable } from './vulnerabilities_findings_details_table';
import { AlertsDetailsTable } from './alerts_findings_details_table';

/**
 * Insights view displayed in the document details expandable flyout left section
 */

interface CspFlyoutPanelProps extends FlyoutPanelProps {
  params: {
    path: PanelPath;
    hasMisconfigurationFindings: boolean;
    hasVulnerabilitiesFindings: boolean;
    hasNonClosedAlerts: boolean;
  };
}

// Type guard to check if the panel is a CspFlyoutPanelProps
function isCspFlyoutPanelProps(
  panelLeft: FlyoutPanelProps | undefined
): panelLeft is CspFlyoutPanelProps {
  return (
    !!panelLeft?.params?.hasMisconfigurationFindings ||
    !!panelLeft?.params?.hasVulnerabilitiesFindings ||
    !!panelLeft?.params?.hasNonClosedAlerts
  );
}

export const InsightsTabCsp = memo(
  ({ value, field }: { value: string; field: 'host.name' | 'user.name' }) => {
    const panels = useExpandableFlyoutState();

    let hasMisconfigurationFindings = false;
    let hasVulnerabilitiesFindings = false;
    let hasNonClosedAlerts = false;
    let subTab: string | undefined;

    // Check if panels.left is of type CspFlyoutPanelProps and extract values
    if (isCspFlyoutPanelProps(panels.left)) {
      hasMisconfigurationFindings = panels.left.params.hasMisconfigurationFindings;
      hasVulnerabilitiesFindings = panels.left.params.hasVulnerabilitiesFindings;
      hasNonClosedAlerts = panels.left.params.hasNonClosedAlerts;
      subTab = panels.left.params.path?.subTab;
    }

    const getDefaultTab = () => {
      if (subTab) {
        return subTab;
      }

      return hasMisconfigurationFindings
        ? CspInsightLeftPanelSubTab.MISCONFIGURATIONS
        : hasVulnerabilitiesFindings
        ? CspInsightLeftPanelSubTab.VULNERABILITIES
        : hasNonClosedAlerts
        ? CspInsightLeftPanelSubTab.ALERTS
        : '';
    };

    const [activeInsightsId, setActiveInsightsId] = useState(getDefaultTab());

    const insightsButtons: EuiButtonGroupOptionProps[] = useMemo(() => {
      const buttons: EuiButtonGroupOptionProps[] = [];

      if (panels.left?.params?.hasNonClosedAlerts) {
        buttons.push({
          id: CspInsightLeftPanelSubTab.ALERTS,
          label: (
            <FormattedMessage
              id="xpack.securitySolution.flyout.left.insights.alertsButtonLabel"
              defaultMessage="Alerts"
            />
          ),
          'data-test-subj': 'alertsTabDataTestId',
        });
      }

      if (panels.left?.params?.hasMisconfigurationFindings) {
        buttons.push({
          id: CspInsightLeftPanelSubTab.MISCONFIGURATIONS,
          label: (
            <FormattedMessage
              id="xpack.securitySolution.flyout.left.insights.misconfigurationButtonLabel"
              defaultMessage="Misconfiguration"
            />
          ),
          'data-test-subj': 'misconfigurationTabDataTestId',
        });
      }

      if (panels.left?.params?.hasVulnerabilitiesFindings) {
        buttons.push({
          id: CspInsightLeftPanelSubTab.VULNERABILITIES,
          label: (
            <FormattedMessage
              id="xpack.securitySolution.flyout.left.insights.vulnerabilitiesButtonLabel"
              defaultMessage="Vulnerabilities"
            />
          ),
          'data-test-subj': 'vulnerabilitiesTabDataTestId',
        });
      }

      return buttons;
    }, [
      panels.left?.params?.hasMisconfigurationFindings,
      panels.left?.params?.hasNonClosedAlerts,
      panels.left?.params?.hasVulnerabilitiesFindings,
    ]);

    const onTabChange = (id: string) => {
      setActiveInsightsId(id);
    };

    if (insightsButtons.length === 0) {
      return null;
    }

    return (
      <>
        <EuiButtonGroup
          color="primary"
          legend={i18n.translate(
            'xpack.securitySolution.flyout.left.insights.optionsButtonGroups',
            {
              defaultMessage: 'Insights options',
            }
          )}
          options={insightsButtons}
          idSelected={activeInsightsId}
          onChange={onTabChange}
          buttonSize="compressed"
          isFullWidth
          data-test-subj={'insightButtonGroupsTestId'}
        />
        <EuiSpacer size="xl" />
        {activeInsightsId === CspInsightLeftPanelSubTab.MISCONFIGURATIONS ? (
          <MisconfigurationFindingsDetailsTable field={field} value={value} />
        ) : activeInsightsId === CspInsightLeftPanelSubTab.VULNERABILITIES ? (
          <VulnerabilitiesFindingsDetailsTable value={value} />
        ) : (
          <AlertsDetailsTable field={field} value={value} />
        )}
      </>
    );
  }
);

InsightsTabCsp.displayName = 'InsightsTab';
