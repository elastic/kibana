/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiToolTip } from '@elastic/eui';

import { TechnicalPreviewBadge } from '../../../../common/components/technical_preview_badge';
import { useUpsellingMessage } from '../../../../common/hooks/use_upselling';

interface TechnicalPreviewBadgeProps {
  label: string;
}

export const AlertSuppressionTechnicalPreviewBadge = ({ label }: TechnicalPreviewBadgeProps) => {
  const alertSuppressionUpsellingMessage = useUpsellingMessage('alert_suppression_rule_details');

  return (
    <>
      <TechnicalPreviewBadge label={label} />
      {alertSuppressionUpsellingMessage && (
        <EuiToolTip position="top" content={alertSuppressionUpsellingMessage}>
          <EuiIcon
            type={'warning'}
            size="l"
            color="#BD271E"
            style={{ marginLeft: '8px' }}
            data-test-subj="alertSuppressionInsufficientLicensingIcon"
          />
        </EuiToolTip>
      )}
    </>
  );
};
