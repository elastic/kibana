/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiFlexItem,
  EuiText,
  EuiFlexGroup,
  EuiIcon,
  EuiLoadingSpinner,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { DeprecationResolutionState } from './kibana_deprecations';

const i18nTexts = {
  manualCellLabel: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.table.manualCellLabel',
    {
      defaultMessage: 'Manual',
    }
  ),
  manualCellTooltipLabel: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.table.manualCellTooltipLabel',
    {
      defaultMessage: 'This issue needs to be resolved manually.',
    }
  ),
  automatedCellLabel: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.table.automatedCellLabel',
    {
      defaultMessage: 'Automated',
    }
  ),
  automationInProgressCellLabel: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.table.automationInProgressCellLabel',
    {
      defaultMessage: 'Resolution in progress…',
    }
  ),
  automationCompleteCellLabel: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.table.automationCompleteCellLabel',
    {
      defaultMessage: 'Resolved',
    }
  ),
  automationFailedCellLabel: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.table.automationFailedCellLabel',
    {
      defaultMessage: 'Resolution failed',
    }
  ),
  automatedCellTooltipLabel: i18n.translate(
    'xpack.upgradeAssistant.kibanaDeprecations.table.automatedCellTooltipLabel',
    {
      defaultMessage: 'This issue can be resolved automatically.',
    }
  ),
};

interface Props {
  deprecationId: string;
  isAutomated: boolean;
  deprecationResolutionState?: DeprecationResolutionState;
}

export const ResolutionTableCell: React.FunctionComponent<Props> = ({
  deprecationId,
  isAutomated,
  deprecationResolutionState,
}) => {
  if (isAutomated) {
    if (deprecationResolutionState?.id === deprecationId) {
      const { resolveDeprecationStatus } = deprecationResolutionState;

      switch (resolveDeprecationStatus) {
        case 'in_progress':
          return (
            <EuiFlexGroup gutterSize="s" alignItems="center" data-test-subj="resolutionStatusCell">
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="m" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s">{i18nTexts.automationInProgressCellLabel}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        case 'fail':
          return (
            <EuiFlexGroup gutterSize="s" alignItems="center" data-test-subj="resolutionStatusCell">
              <EuiFlexItem grow={false}>
                <EuiIcon type="alert" color="danger" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s">{i18nTexts.automationFailedCellLabel}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        case 'ok':
        default:
          return (
            <EuiFlexGroup gutterSize="s" alignItems="center" data-test-subj="resolutionStatusCell">
              <EuiFlexItem grow={false}>
                <EuiIcon type="check" color="success" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s">{i18nTexts.automationCompleteCellLabel}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
      }
    }

    return (
      <EuiToolTip position="top" content={i18nTexts.automatedCellTooltipLabel}>
        <EuiFlexGroup gutterSize="s" alignItems="center" data-test-subj="resolutionStatusCell">
          <EuiFlexItem grow={false}>
            <EuiIcon type="indexSettings" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">{i18nTexts.automatedCellLabel}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiToolTip>
    );
  }

  return (
    <EuiToolTip
      position="top"
      content={i18nTexts.manualCellTooltipLabel}
      data-test-subj="resolutionStatusCell"
    >
      <EuiText size="s" color="subdued">
        {i18nTexts.manualCellLabel}
      </EuiText>
    </EuiToolTip>
  );
};
