/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import { EuiSwitch } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { StepDefineFormHook } from '../step_define';

export const DatePickerApplySwitch: FC<StepDefineFormHook> = ({
  datePicker: {
    actions: { setDatePickerApplyEnabled },
    state: { isDatePickerApplyEnabled },
  },
}) => {
  return (
    <EuiSwitch
      label={i18n.translate(
        'xpack.transform.stepDefineForm.advancedEditorSourceConfigSwitchLabel',
        {
          defaultMessage: 'Apply time range',
        }
      )}
      checked={isDatePickerApplyEnabled}
      onChange={() => {
        setDatePickerApplyEnabled(!isDatePickerApplyEnabled);
      }}
      data-test-subj="transformDatePickerApplySwitch"
    />
  );
};
