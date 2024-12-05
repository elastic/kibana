/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, type EuiStepProps, type EuiStepStatus } from '@elastic/eui';
import * as i18n from './translations';

export interface CheckResourcesStepProps {
  status: EuiStepStatus;
  onComplete: () => void;
}
export const useCheckResourcesStep = ({
  status,
  onComplete,
}: CheckResourcesStepProps): EuiStepProps => {
  // onComplete(); // TODO: check the resources
  return {
    title: i18n.RULES_DATA_INPUT_CHECK_RESOURCES_TITLE,
    status,
    children: (
      <EuiText size="xs" color="subdued">
        {i18n.RULES_DATA_INPUT_CHECK_RESOURCES_DESCRIPTION}
      </EuiText>
    ),
  };
};
