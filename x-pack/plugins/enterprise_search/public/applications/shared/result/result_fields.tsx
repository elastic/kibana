/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { EuiTable, EuiTableBody } from '@elastic/eui';

import { ResultField } from './result_field';
import { ResultFieldProps } from './types';

interface Props {
  fields: ResultFieldProps[];
  isExpanded: boolean;
}

export const ResultFields: React.FC<Props> = ({ fields, isExpanded }) => {
  return (
    <EuiTable>
      <EuiTableBody>
        {fields.map((field) => (
          <ResultField
            isExpanded={isExpanded}
            iconType={field.iconType}
            fieldName={field.fieldName}
            fieldValue={field.fieldValue}
            fieldType={field.fieldType}
          />
        ))}
      </EuiTableBody>
    </EuiTable>
  );
};
