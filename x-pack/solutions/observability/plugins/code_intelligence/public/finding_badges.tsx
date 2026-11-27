/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

import { isFindingStatus, type FindingStatus } from '../common/finding_filters';

export const findingStatusLabels: Record<FindingStatus, string> = {
  open: i18n.translate('xpack.codeIntelligence.findingStatus.open', { defaultMessage: 'Open' }),
  verified: i18n.translate('xpack.codeIntelligence.findingStatus.verified', {
    defaultMessage: 'Verified',
  }),
  invalid: i18n.translate('xpack.codeIntelligence.findingStatus.invalid', {
    defaultMessage: 'Invalid',
  }),
};

const findingTypeLabels: Record<string, string> = {
  'sensitive-data': i18n.translate('xpack.codeIntelligence.findingType.sensitiveData', {
    defaultMessage: 'Sensitive data',
  }),
};

/** Open needs attention, verified is a confirmed exposure, invalid is closed as a false alarm. */
export const FindingStatusBadge = ({ status }: { status?: string }) => {
  const { severity } = useEuiTheme().euiTheme.colors;
  if (!isFindingStatus(status)) return null;
  const colors: Record<FindingStatus, string> = {
    open: severity.warning,
    verified: severity.danger,
    invalid: 'hollow',
  };
  return (
    <EuiBadge
      color={colors[status]}
      iconType={status === 'verified' ? 'check' : status === 'invalid' ? 'cross' : undefined}
      data-test-subj="codeIntelligenceFindingStatusBadge"
    >
      {findingStatusLabels[status]}
    </EuiBadge>
  );
};

export const FindingTypeBadge = ({ findingType }: { findingType?: string }) => {
  if (findingType === undefined) return null;
  return (
    <EuiBadge color="hollow" iconType="lock" data-test-subj="codeIntelligenceFindingTypeBadge">
      {findingTypeLabels[findingType] ?? findingType}
    </EuiBadge>
  );
};
