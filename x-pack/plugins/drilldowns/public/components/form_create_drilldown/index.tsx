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

// eslint-disable-next-line
export interface FormCreateDrilldownProps {}

export const FormCreateDrilldown: React.FC<FormCreateDrilldownProps> = () => {
  return (
    <div>
      <DrilldownHelloBar />
      <EuiForm>
        <EuiFormRow label={txtNameOfDrilldown}>
          <EuiFieldText name="drilldown_name" placeholder={txtUntitledDrilldown} />
        </EuiFormRow>
        <EuiFormRow label={txtDrilldownAction}>
          <DrilldownPicker />
        </EuiFormRow>
      </EuiForm>
    </div>
  );
};
