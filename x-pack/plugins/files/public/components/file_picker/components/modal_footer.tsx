/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiModalFooter } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React from 'react';

import { Pagination } from './pagination';
import { SelectButton, Props as SelectButtonProps } from './select_button';

interface Props {
  onDone: SelectButtonProps['onClick'];
}

export const ModalFooter: FunctionComponent<Props> = ({ onDone }) => {
  return (
    <EuiModalFooter>
      <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween" alignItems="center">
        <Pagination />
        <SelectButton onClick={onDone} />
      </EuiFlexGroup>
    </EuiModalFooter>
  );
};
