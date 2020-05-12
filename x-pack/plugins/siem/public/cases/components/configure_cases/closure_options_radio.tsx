/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactNode, useCallback } from 'react';
import { EuiRadioGroup } from '@elastic/eui';

import { ClosureType } from '../../containers/configure/types';
import * as i18n from './translations';

interface ClosureRadios {
  id: ClosureType;
  label: ReactNode;
}

const radios: ClosureRadios[] = [
  {
    id: 'close-by-user',
    label: i18n.CASE_CLOSURE_OPTIONS_MANUAL,
  },
  {
    id: 'close-by-pushing',
    label: i18n.CASE_CLOSURE_OPTIONS_NEW_INCIDENT,
  },
];

export interface ClosureOptionsRadioComponentProps {
  closureTypeSelected: ClosureType;
  disabled: boolean;
  onChangeClosureType: (newClosureType: ClosureType) => void;
}

const ClosureOptionsRadioComponent: React.FC<ClosureOptionsRadioComponentProps> = ({
  closureTypeSelected,
  disabled,
  onChangeClosureType,
}) => {
  const onChangeLocal = useCallback(
    (id: string) => {
      onChangeClosureType(id as ClosureType);
    },
    [onChangeClosureType]
  );

  return (
    <EuiRadioGroup
      disabled={disabled}
      options={radios}
      idSelected={closureTypeSelected}
      onChange={onChangeLocal}
      name="closure_options"
      data-test-subj="closure-options-radio-group"
    />
  );
};

export const ClosureOptionsRadio = React.memo(ClosureOptionsRadioComponent);
