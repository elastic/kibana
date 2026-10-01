/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

import { severityForScore, type CatalogSeverity } from '../common/catalog_filters';

export const severityLabels: Record<CatalogSeverity, string> = {
  low: i18n.translate('xpack.codeIntelligence.severity.low', { defaultMessage: 'Low' }),
  medium: i18n.translate('xpack.codeIntelligence.severity.medium', { defaultMessage: 'Medium' }),
  high: i18n.translate('xpack.codeIntelligence.severity.high', { defaultMessage: 'High' }),
  critical: i18n.translate('xpack.codeIntelligence.severity.critical', {
    defaultMessage: 'Critical',
  }),
};

/** Renders nothing when the entry has no score. */
export const SeverityBadge = ({ score }: { score?: number }) => {
  const { euiTheme } = useEuiTheme();
  const severity = severityForScore(score);
  if (severity === undefined) return null;
  const colors: Record<CatalogSeverity, string> = {
    low: euiTheme.colors.severity.neutral,
    medium: euiTheme.colors.severity.warning,
    high: euiTheme.colors.severity.risk,
    critical: euiTheme.colors.severity.danger,
  };
  return (
    <EuiBadge
      color={colors[severity]}
      title={i18n.translate('xpack.codeIntelligence.severity.scoreTitle', {
        defaultMessage: 'Severity score {score} of 100',
        values: { score },
      })}
      data-test-subj="codeIntelligenceSeverityBadge"
    >
      {severityLabels[severity]}
    </EuiBadge>
  );
};
