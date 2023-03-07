/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiButtonIcon } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useSelectedLocation } from '../../monitor_details/hooks/use_selected_location';
import { useSyntheticsSettingsContext } from '../../../contexts';

export const StepDetailsLinkIcon = ({
  stepIndex,
  checkGroup,
  configId,
  asButton,
  label,
}: {
  checkGroup: string;
  label?: string;
  configId: string;
  stepIndex?: number;
  asButton?: boolean;
}) => {
  const { basePath } = useSyntheticsSettingsContext();
  const selectedLocation = useSelectedLocation();

  if (asButton) {
    return (
      <EuiButtonEmpty
        flush="left"
        iconType="apmTrace"
        href={`${basePath}/app/synthetics/monitor/${configId}/test-run/${checkGroup}/step/${stepIndex}?locationId=${selectedLocation?.id}`}
      >
        {label ?? VIEW_DETAILS}
      </EuiButtonEmpty>
    );
  }

  return (
    <EuiButtonIcon
      aria-label={VIEW_DETAILS}
      title={VIEW_DETAILS}
      size="s"
      href={`${basePath}/app/synthetics/monitor/${configId}/test-run/${checkGroup}/step/${stepIndex}?locationId=${selectedLocation?.id}`}
      target="_self"
      iconType="apmTrace"
    />
  );
};

const VIEW_DETAILS = i18n.translate('xpack.synthetics.monitor.step.viewStepDetails', {
  defaultMessage: 'View step details',
});
