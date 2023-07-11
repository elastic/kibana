/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiToolTip, EuiBetaBadge } from '@elastic/eui';

import type { LicenseService } from '../../../../../common/license';
import { minimumLicenseForSuppression } from '../../../../../common/detection_engine/rule_schema';

import * as i18n from './translations';

interface TechnicalPreviewBadgeProps {
  label: string;
  license: LicenseService;
}

export const TechnicalPreviewBadge = ({ label, license }: TechnicalPreviewBadgeProps) => (
  <>
    {label}
    <EuiBetaBadge
      label={i18n.ALERT_SUPPRESSION_TECHNICAL_PREVIEW}
      style={{ verticalAlign: 'middle', marginLeft: '8px' }}
      size="s"
    />
    {!license.isAtLeast(minimumLicenseForSuppression) && (
      <EuiToolTip position="top" content={i18n.ALERT_SUPPRESSION_INSUFFICIENT_LICENSE}>
        <EuiIcon type={'warning'} size="l" color="#BD271E" style={{ marginLeft: '8px' }} />
      </EuiToolTip>
    )}
  </>
);
