/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { Criterion } from './criterion';

export const Criteria: React.FC = ({ fields, criteria, updateCriteria }) => {
  if (!criteria) return null;
  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem grow={false}>
        {criteria.map((criterion, idx) => {
          return (
            <Criterion
              key={idx}
              idx={idx}
              fields={fields}
              criterion={criterion}
              updateCriteria={updateCriteria}
            />
          );
        })}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
