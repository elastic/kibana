/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';

import { StepDefineExposedState } from '../common';
import { StepDefineFormProps } from '../step_define_form';

export const useDatePicker = (
  defaults: StepDefineExposedState,
  dataView: StepDefineFormProps['searchItems']['dataView']
) => {
  // The internal state of the date picker apply button.
  const [isDatePickerApplyEnabled, setDatePickerApplyEnabled] = useState(
    defaults.isDatePickerApplyEnabled
  );

  return {
    actions: { setDatePickerApplyEnabled },
    state: { isDatePickerApplyEnabled },
  };
};
