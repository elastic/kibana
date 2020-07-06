/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { Forms } from '../../../../shared_imports';
import { WizardContent } from '../template_form';
import { StepLogistics } from './step_logistics';

interface Props {
  isLegacy?: boolean;
  isEditing?: boolean;
}

export const StepLogisticsContainer = ({ isEditing, isLegacy }: Props) => {
  const { defaultValue, updateContent } = Forms.useContent<WizardContent, 'logistics'>('logistics');

  return (
    <StepLogistics
      defaultValue={defaultValue}
      onChange={updateContent}
      isEditing={isEditing}
      isLegacy={isLegacy}
    />
  );
};
