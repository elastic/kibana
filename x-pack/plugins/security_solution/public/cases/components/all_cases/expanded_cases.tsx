/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useMemo } from 'react';
import { EuiBasicTable } from '@elastic/eui';
import { Case } from '../../containers/types';
import { useGetUserSavedObjectPermissions } from '../../../common/lib/kibana';

interface ExpandedCases {
  data: Case[];
}

export const ExpandedCased = React.memo<ExpandedCases>(({ data, columns }) => {
  const items = useMemo(() => [basicCase], [basicCase]);

  return (
    <EuiBasicTable columns={columns} data-test-subj="sub-cases-table" itemId="id" items={items} />
  );
});

ExpandedCased.displayName = ExpandedCased;
