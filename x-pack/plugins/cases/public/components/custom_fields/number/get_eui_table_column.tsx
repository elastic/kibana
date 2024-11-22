/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { CaseCustomFieldNumber } from '../../../../common/types/domain';
import type { CustomFieldEuiTableColumn } from '../types';

export const getEuiTableColumn = ({
  label,
}: {
  label: string;
}): CustomFieldEuiTableColumn<CaseCustomFieldNumber> => ({
  name: label,
  width: '150px',
  render: (customField) => {
    return (
      <p
        className="eui-textNumber"
        data-test-subj={`number-custom-field-column-view-${customField.key}`}
      >
        {customField.value}
      </p>
    );
  },
  'data-test-subj': 'number-custom-field-column',
});
