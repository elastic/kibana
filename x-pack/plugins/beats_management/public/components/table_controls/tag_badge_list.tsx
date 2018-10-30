/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { AssignmentActionType } from '../table/table';
import { TagAssignment } from './tag_assignment';

interface TagBadgeListProps {
  items: any[];
  actionHandler(action: AssignmentActionType, payload?: any): void;
}

export const TagBadgeList = (props: TagBadgeListProps) => (
  // @ts-ignore direction prop type "column" not defined in current EUI version
  <EuiFlexGroup direction="column" gutterSize="xs">
    {props.items.map((item: any) => (
      <EuiFlexItem key={`${item.id}`}>
        <TagAssignment
          tag={item}
          assignTag={(id: string) => props.actionHandler(AssignmentActionType.Assign, id)}
        />
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);
