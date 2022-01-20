/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescribedFormGroup, EuiFormRow } from '@elastic/eui';

import { ClosureType } from '../../containers/configure/types';
import { ClosureOptionsRadio } from './closure_options_radio';
import * as i18n from './translations';

export interface ClosureOptionsProps {
  closureTypeSelected: ClosureType;
  disabled: boolean;
  onChangeClosureType: (newClosureType: ClosureType) => void;
}

const ClosureOptionsComponent: React.FC<ClosureOptionsProps> = ({
  closureTypeSelected,
  disabled,
  onChangeClosureType,
}) => (
  <EuiDescribedFormGroup
    fullWidth
    title={<h3>{i18n.CASE_CLOSURE_OPTIONS_TITLE}</h3>}
    description={
      <>
        <p>{i18n.CASE_CLOSURE_OPTIONS_DESC}</p>
      </>
    }
    data-test-subj="case-closure-options-form-group"
  >
    <EuiFormRow
      fullWidth
      label={i18n.CASE_CLOSURE_OPTIONS_LABEL}
      data-test-subj="case-closure-options-form-row"
    >
      <ClosureOptionsRadio
        closureTypeSelected={closureTypeSelected}
        disabled={disabled}
        onChangeClosureType={onChangeClosureType}
        data-test-subj="case-closure-options-radio"
      />
    </EuiFormRow>
  </EuiDescribedFormGroup>
);
ClosureOptionsComponent.displayName = 'ClosureOptions';

export const ClosureOptions = React.memo(ClosureOptionsComponent);
