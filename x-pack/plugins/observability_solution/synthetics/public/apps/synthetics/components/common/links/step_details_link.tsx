/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonEmpty, EuiButtonIcon } from '@elastic/eui';
import { CommonProps } from '@elastic/eui/src/components/common';

import { useSyntheticsSettingsContext } from '../../../contexts';
import { useSelectedLocation } from '../../monitor_details/hooks/use_selected_location';

export const StepDetailsLinkIcon = ({
  stepIndex,
  checkGroup,
  configId,
  asButton,
  label,
  target = '_self',
  ...commonProps
}: CommonProps & {
  checkGroup: string;
  label?: string;
  configId: string;
  stepIndex?: number;
  asButton?: boolean;
  target?: '_self' | '_blank';
}) => {
  const { basePath } = useSyntheticsSettingsContext();
  const selectedLocation = useSelectedLocation();

  const stepDetailsLink = `${basePath}/app/synthetics/monitor/${configId}/test-run/${checkGroup}/step/${stepIndex}?locationId=${selectedLocation?.id}`;

  if (asButton) {
    return (
      <EuiButtonEmpty
        data-test-subj="syntheticsStepDetailsLinkIconButton"
        {...commonProps}
        flush="left"
        iconType="apmTrace"
        href={stepDetailsLink}
      >
        {label ?? VIEW_DETAILS}
      </EuiButtonEmpty>
    );
  }

  return (
    <EuiButtonIcon
      data-test-subj="syntheticsStepDetailsLinkIconButton"
      {...commonProps}
      title={VIEW_DETAILS(stepIndex)}
      size="s"
      href={stepDetailsLink}
      target={target}
      iconType="apmTrace"
    />
  );
};

const VIEW_DETAILS = (stepIndex: number = 1) =>
  i18n.translate('xpack.synthetics.monitor.step.viewStepDetails', {
    defaultMessage: 'View step {stepIndex} details',
    values: {
      stepIndex,
    },
  });
