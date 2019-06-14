/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useContext, useRef, useState } from 'react';

import {
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormHelpText,
  EuiFormRow,
  EuiSpacer,
  EuiFieldNumber,
} from '@elastic/eui';

interface Props {
  start: number;
  end: number;
  setStart: React.Dispatch<React.SetStateAction<number>>;
  setEnd: React.Dispatch<React.SetStateAction<number>>;
}

export const TestInputs: FC<Props> = ({ start, end, setStart, setEnd }) => {
  function startChange(e: any) {
    setStart(+e.target.value);
  }
  function endChange(e: any) {
    setEnd(+e.target.value);
  }

  return (
    <Fragment>
      <EuiFieldNumber onChange={startChange} value={start} />
      <EuiFieldNumber onChange={endChange} value={end} />
    </Fragment>
  );
};
