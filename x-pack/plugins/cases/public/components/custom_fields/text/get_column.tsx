/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { EuiTableComputedColumnType } from '@elastic/eui';
import type { CaseUI } from '../../../containers/types';

export const getColumn = ({
  key,
  label,
}: {
  key: string;
  label: string;
}): EuiTableComputedColumnType<CaseUI> => ({
  name: label,
  render: (theCase: CaseUI) => {
    const index = theCase.customFields.findIndex((element) => element.key === key);

    if (index !== -1) {
      return <p>{theCase.customFields[index].value}</p>;
    }
  },
});
