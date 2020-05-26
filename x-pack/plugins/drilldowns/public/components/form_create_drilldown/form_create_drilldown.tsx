/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiForm, EuiFormRow, EuiFieldText } from '@elastic/eui';
import { DrilldownHelloBar } from '../drilldown_hello_bar';
import { txtNameOfDrilldown, txtUntitledDrilldown, txtDrilldownAction } from './i18n';
import { DrilldownPicker } from '../drilldown_picker';

const noop = () => {};

export interface FormCreateDrilldownProps {
  name?: string;
  onNameChange?: (name: string) => void;
}

export const FormCreateDrilldown: React.FC<FormCreateDrilldownProps> = ({
  name = '',
  onNameChange = noop,
}) => {
  const nameFragment = (
    <EuiFormRow label={txtNameOfDrilldown}>
      <EuiFieldText
        name="drilldown_name"
        placeholder={txtUntitledDrilldown}
        value={name}
        disabled={onNameChange === noop}
        onChange={(event) => onNameChange(event.target.value)}
        data-test-subj="dynamicActionNameInput"
      />
    </EuiFormRow>
  );

  const triggerPicker = <div>Trigger Picker will be here</div>;
  const actionPicker = (
    <EuiFormRow label={txtDrilldownAction}>
      <DrilldownPicker />
    </EuiFormRow>
  );

  return (
    <>
      <DrilldownHelloBar />
      <EuiForm>{nameFragment}</EuiForm>
      {triggerPicker}
      {actionPicker}
    </>
  );
};
