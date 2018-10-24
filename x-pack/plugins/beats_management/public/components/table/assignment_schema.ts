/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AssignmentActionType } from './table';

export enum AssignmentComponentType {
  Action,
  Popover,
  SelectionCount,
  TagBadgeList,
}

export interface AssignmentControlSchema {
  name: string;
  type: AssignmentComponentType;
  danger?: boolean;
  action?: AssignmentActionType;
  showWarning?: boolean;
  warningHeading?: string;
  warningMessage?: string;
  lazyLoad?: boolean;
  children?: AssignmentControlSchema[];
  grow?: boolean;
}

export const beatsListAssignmentOptions: AssignmentControlSchema[] = [
  {
    type: AssignmentComponentType.Action,
    grow: false,
    name: 'Disenroll selected',
    showWarning: true,
    warningHeading: 'Disenroll beats',
    warningMessage: 'This will disenroll the selected beat(s) from centralized management',
    action: AssignmentActionType.Delete,
    danger: true,
  },
  {
    type: AssignmentComponentType.Popover,
    name: 'Set tags',
    grow: false,
    lazyLoad: true,
    children: [
      {
        name: 'Assign tags',
        type: AssignmentComponentType.TagBadgeList,
      },
    ],
  },
  {
    type: AssignmentComponentType.SelectionCount,
    grow: true,
    name: 'selectionCount',
  },
];

export const tagListAssignmentOptions: AssignmentControlSchema[] = [
  {
    type: AssignmentComponentType.Action,
    danger: true,
    grow: false,
    name: 'Remove tag(s)',
    showWarning: true,
    warningHeading: 'Remove tag(s)',
    warningMessage: 'Remove the tag?',
    action: AssignmentActionType.Delete,
  },
];

export const tagConfigAssignmentOptions: AssignmentControlSchema[] = [
  {
    type: AssignmentComponentType.Action,
    danger: true,
    grow: false,
    name: 'Remove tag(s)',
    showWarning: true,
    warningHeading: 'Remove tag(s)',
    warningMessage: 'Remove the tag from the selected beat(s)?',
    action: AssignmentActionType.Delete,
  },
];
