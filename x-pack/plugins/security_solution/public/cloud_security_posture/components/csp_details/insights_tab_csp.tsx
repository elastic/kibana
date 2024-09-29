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
import { useExpandableFlyoutState } from '@kbn/expandable-flyout';
import { i18n } from '@kbn/i18n';
import { MisconfigurationFindingsDetailsTable } from './misconfiguration_findings_details_table';
import { VulnerabilitiesFindingsDetailsTable } from './vulnerabilities_findings_details_table';

/**
 * Insights view displayed in the document details expandable flyout left section
 */

export const InsightsTabCsp = memo(
  ({ name, fieldName }: { name: string; fieldName: 'host.name' | 'user.name' }) => {
    const panels = useExpandableFlyoutState();
    const defaultTab = () =>
      panels.left?.params?.hasMisconfigurationFindings
        ? 'misconfigurationTabId'
        : panels.left?.params?.hasVulnerabilitiesFindings
        ? 'vulnerabilitiesTabId'
        : 'undefined';

    const [activeInsightsId, setActiveInsightsId] = useState(
      panels.left?.path?.subTab || defaultTab
    );
    const insightsButtonsNew: EuiButtonGroupOptionProps[] = useMemo(() => {
      const buttons: EuiButtonGroupOptionProps[] = [];
      if (panels.left?.params?.hasMisconfigurationFindings) {
        buttons.push({
          id: 'misconfigurationTabId',
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
          id: 'vulnerabilitiesTabId',
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
      panels.left?.params?.hasVulnerabilitiesFindings,
    ]);
    const onTabChange = (id: string) => {
      setActiveInsightsId(id);
    };

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
          options={insightsButtonsNew}
          idSelected={activeInsightsId}
          onChange={onTabChange}
          buttonSize="compressed"
          isFullWidth
          data-test-subj={'insightButtonGroupsTestId'}
        />
        <EuiSpacer size="xl" />
        {/* <MisconfigurationFindingsDetailsTable fieldName={fieldName} queryName={name} /> */}
        {activeInsightsId === 'misconfigurationTabId' ? (
          <MisconfigurationFindingsDetailsTable fieldName={fieldName} queryName={name} />
        ) : (
          // Render the vulnerabilities details table here when the vulnerabilities tab is selected
          <VulnerabilitiesFindingsDetailsTable queryName={name} />
        )}
      </>
    );
  }
);

InsightsTabCsp.displayName = 'InsightsTab';
