/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiButtonGroup, EuiSpacer } from '@elastic/eui';
import type { EuiButtonGroupOptionProps } from '@elastic/eui/src/components/button/button_group/button_group';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useExpandableFlyoutState } from '@kbn/expandable-flyout';
import { MisconfigurationFindingsDetailsTable } from './misconfiguration_findings_details_table';

enum InsightsTabCspTab {
  MISCONFIGURATION = 'misconfigurationTabId',
}

const insightsButtons: EuiButtonGroupOptionProps[] = [
  {
    id: InsightsTabCspTab.MISCONFIGURATION,
    label: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.left.insights.misconfigurationButtonLabel"
        defaultMessage="Misconfiguration"
      />
    ),
    'data-test-subj': 'misconfigurationTabDataTestId',
  },
];

/**
 * Insights view displayed in the document details expandable flyout left section
 */
export const InsightsTabCsp = memo(
  ({ name, fieldName }: { name: string; fieldName: 'host.name' | 'user.name' }) => {
    const panels = useExpandableFlyoutState();
    const activeInsightsId = panels.left?.path?.subTab ?? 'misconfigurationTabId';

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
          onChange={() => {}}
          buttonSize="compressed"
          isFullWidth
          data-test-subj={'insightButtonGroupsTestId'}
        />
        <EuiSpacer size="xl" />
        <MisconfigurationFindingsDetailsTable fieldName={fieldName} queryName={name} />
      </>
    );
  }
);

InsightsTabCsp.displayName = 'InsightsTab';
