/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup } from '@elastic/eui';
import React from 'react';
import { AssignmentOptionList } from './assignment_option_types';

interface AssignmentListProps {
  assignmentOptions: AssignmentOptionList;
}

export const AssignmentList = ({
  assignmentOptions: { items, renderAssignmentOptions },
}: AssignmentListProps) => (
  // @ts-ignore direction prop not available on current typing
  <EuiFlexGroup direction="column" gutterSize="xs">
    {items.map((options, index) => renderAssignmentOptions(options, `${index}`))}
  </EuiFlexGroup>
);
