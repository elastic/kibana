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
import type { FlyoutPanels } from '@kbn/expandable-flyout/src/store/state';
import { CspInsightLeftPanelSubTab } from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import { MisconfigurationFindingsDetailsTable } from './misconfiguration_findings_details_table';
import { VulnerabilitiesFindingsDetailsTable } from './vulnerabilities_findings_details_table';

/**
 * Insights view displayed in the document details expandable flyout left section
 */

interface CspFlyoutPanelProps extends FlyoutPanelProps {
  params: {
    path: PanelPath;
    hasMisconfigurationFindings: boolean;
    hasVulnerabilitiesFindings: boolean;
  };
}
interface CspFlyoutPanels extends FlyoutPanels {
  left: CspFlyoutPanelProps;
}

// Type guard to check if the path is a PathPanel
const isPathPanel = (path: PanelPath): path is PanelPath => {
  return typeof path?.tab === 'string';
};

export const InsightsTabCsp = memo(
  ({ name, fieldName }: { name: string; fieldName: 'host.name' | 'user.name' }) => {
    /* Using type cast here because originally I thought paths are part of Params when its actually its own field. The correct
    way to solve this is by putting path outside params for every single openLeftPanel call in this folder, but given the time frame
    We decided to do this for now */
    const panels = useExpandableFlyoutState() as CspFlyoutPanels;

    const getDefaultTab = () =>
      panels.left?.params?.hasMisconfigurationFindings
        ? CspInsightLeftPanelSubTab.MISCONFIGURATIONS
        : panels.left?.params?.hasVulnerabilitiesFindings
        ? CspInsightLeftPanelSubTab.VULNERABILITIES
        : 'undefined';

    const [activeInsightsId, setActiveInsightsId] = useState(
      panels.left?.params?.path?.subTab || getDefaultTab()
    );

    const insightsButtonsNew: EuiButtonGroupOptionProps[] = useMemo(() => {
      const buttons: EuiButtonGroupOptionProps[] = [];

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
      panels.left?.params?.hasVulnerabilitiesFindings,
    ]);

    const onTabChange = (id: string) => {
      setActiveInsightsId(id);
    };

    if (!isPathPanel(panels.left?.params?.path)) return <></>;

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
        {activeInsightsId === CspInsightLeftPanelSubTab.MISCONFIGURATIONS ? (
          <MisconfigurationFindingsDetailsTable fieldName={fieldName} queryName={name} />
        ) : (
          <VulnerabilitiesFindingsDetailsTable queryName={name} />
        )}
      </>
    );
  }
);

InsightsTabCsp.displayName = 'InsightsTab';
