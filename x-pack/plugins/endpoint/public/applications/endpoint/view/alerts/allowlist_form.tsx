/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { memo, useEffect, useCallback } from 'react';
import { EuiForm, EuiFormRow, EuiSpacer, EuiSwitch, EuiFieldText } from '@elastic/eui';
import * as selectors from '../../store/alerts/selectors';

export const AllowlistForm = memo(() => {
  return (
    <EuiForm>
      <EuiFormRow>
        <EuiSwitch
          label="Isn't this modal form cool?"
          checked={this.state.isSwitchChecked}
          onChange={this.onSwitchChange}
        />
      </EuiFormRow>

      <EuiFormRow label="A text field">
        <EuiFieldText name="popfirst" />
      </EuiFormRow>

      <EuiSpacer />
    </EuiForm>
  );
});
