/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AssignmentActionType } from './table';

export interface AssignmentControlSchema {
  id?: number;
  name: string;
  danger?: boolean;
  action?: AssignmentActionType;
  showWarning?: boolean;
  warningHeading?: string;
  warningMessage?: string;
  lazyLoad?: boolean;
  panel?: AssignmentControlSchema;
  grow?: boolean;
}

export const beatsListAssignmentOptions: AssignmentControlSchema[] = [
  {
    grow: false,
    name: 'Unenroll selected',
    showWarning: true,
    warningHeading: 'Unenroll selected beats?',
    warningMessage: 'The selected Beats will no longer use central management',
    action: AssignmentActionType.Delete,
    danger: true,
  },
  {
    name: 'Set tags',
    grow: false,
    lazyLoad: true,
    panel: {
      id: 1,
      name: 'Assign tags',
    },
  },
];

export const tagListAssignmentOptions: AssignmentControlSchema[] = [
  {
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
    danger: true,
    grow: false,
    name: 'Remove tag(s)',
    showWarning: true,
    warningHeading: 'Remove tag(s)',
    warningMessage: 'Remove the tag from the selected beat(s)?',
    action: AssignmentActionType.Delete,
  },
];
