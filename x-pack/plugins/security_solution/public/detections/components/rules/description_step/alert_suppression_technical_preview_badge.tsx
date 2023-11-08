/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiToolTip } from '@elastic/eui';

import type { LicenseService } from '../../../../../common/license';
import { TechnicalPreviewBadge } from '../technical_preview_badge';
import * as i18n from './translations';
import { MINIMUM_LICENSE_FOR_SUPPRESSION } from '../../../../../common/detection_engine/constants';

interface TechnicalPreviewBadgeProps {
  label: string;
  license: LicenseService;
}

export const AlertSuppressionTechnicalPreviewBadge = ({
  label,
  license,
}: TechnicalPreviewBadgeProps) => (
  <>
    <TechnicalPreviewBadge label={label} />
    {!license.isAtLeast(MINIMUM_LICENSE_FOR_SUPPRESSION) && (
      <EuiToolTip position="top" content={i18n.ALERT_SUPPRESSION_INSUFFICIENT_LICENSE}>
        <EuiIcon type={'warning'} size="l" color="#BD271E" style={{ marginLeft: '8px' }} />
      </EuiToolTip>
    )}
  </>
);
