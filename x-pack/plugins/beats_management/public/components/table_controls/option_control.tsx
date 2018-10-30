/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { AssignmentComponentType, AssignmentControlSchema } from '../table';
import { AssignmentActionType } from '../table';
import { ActionControl } from './action_control';
import { PopoverControl } from './popover_control';
import { SelectionCount } from './selection_count';
import { TagBadgeList } from './tag_badge_list';

interface OptionControlProps {
  items: any[];
  schema: AssignmentControlSchema;
  selectionCount: number;
  actionHandler(action: AssignmentActionType, payload?: any): void;
}

export const OptionControl = (props: OptionControlProps) => {
  const {
    actionHandler,
    items,
    schema,
    schema: { action, danger, name, showWarning, warningHeading, warningMessage },
    selectionCount,
  } = props;
  switch (schema.type) {
    case AssignmentComponentType.Action:
      if (!action) {
        throw Error('Action cannot be undefined');
      }
      return (
        <ActionControl
          actionHandler={actionHandler}
          action={action}
          danger={danger}
          name={name}
          showWarning={showWarning}
          warningHeading={warningHeading}
          warningMessage={warningMessage}
        />
      );
    case AssignmentComponentType.Popover:
      return <PopoverControl {...props} />;
    case AssignmentComponentType.SelectionCount:
      return <SelectionCount selectionCount={selectionCount} />;
    case AssignmentComponentType.TagBadgeList:
      return <TagBadgeList actionHandler={actionHandler} items={items} />;
  }
  return <div>{schema.type}</div>;
};
