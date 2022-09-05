/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCheckbox } from '@elastic/eui';
import type { ControlColumnProps } from '../../common/types/timeline';

const SelectionHeaderCell = () => {
  return (
    <div data-test-subj="test-header-control-column-cell">
      <EuiCheckbox id="selection-toggle" aria-label="Select all rows" onChange={() => null} />
    </div>
  );
};

const SelectionRowCell = ({ rowIndex }: { rowIndex: number }) => {
  return (
    <div data-test-subj="test-body-control-column-cell">
      <EuiCheckbox
        id={`${rowIndex}`}
        aria-label={`Select row test`}
        checked={false}
        onChange={() => null}
      />
    </div>
  );
};

export const testLeadingControlColumn: ControlColumnProps = {
  id: 'test-leading-control',
  headerCellRender: SelectionHeaderCell,
  rowCellRender: SelectionRowCell,
  width: 100,
};
