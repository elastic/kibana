/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiButton,
  EuiSpacer,
  EuiColorPicker,
  EuiTextArea,
} from '@elastic/eui';
import { txtTitle, txtColor, txtDescription, txtSave } from './i18n';

export const CreateNewTagForm: React.FC = () => {
  return (
    <EuiForm component="form">
      <EuiFormRow label={txtTitle}>
        <EuiFieldText name="first" />
      </EuiFormRow>

      <EuiFormRow label={txtColor}>
        <EuiColorPicker onChange={() => {}} color={'#ffffff'} />
      </EuiFormRow>

      <EuiFormRow label={txtDescription}>
        <EuiTextArea aria-label={txtDescription} value={''} onChange={() => {}} />
      </EuiFormRow>

      <EuiSpacer />

      <EuiButton type="submit" fill>
        {txtSave}
      </EuiButton>
    </EuiForm>
  );
};
