/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
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
    name: i18n.translate('xpack.beatsManagement.beatsListAssignmentOptions.disenrollButtonLabel', {
      defaultMessage: 'Disenroll selected',
    }),
    showWarning: true,
    warningHeading: i18n.translate(
      'xpack.beatsManagement.beatsListAssignmentOptions.disenrollBeatsWarninigTitle',
      { defaultMessage: 'Disenroll beats' }
    ),
    warningMessage: i18n.translate(
      'xpack.beatsManagement.beatsListAssignmentOptions.disenrollBeatsWarninigMessage',
      { defaultMessage: 'This will disenroll the selected beat(s) from centralized management' }
    ),
    action: AssignmentActionType.Delete,
    danger: true,
  },
  {
    type: AssignmentComponentType.Popover,
    name: i18n.translate('xpack.beatsManagement.beatsListAssignmentOptions.setTagsButtonLabel', {
      defaultMessage: 'Set tags',
    }),
    grow: false,
    lazyLoad: true,
    children: [
      {
        name: i18n.translate('xpack.beatsManagement.beatsListAssignmentOptions.assignTagsName', {
          defaultMessage: 'Assign tags',
        }),
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
    name: i18n.translate('xpack.beatsManagement.tagListAssignmentOptions.removeTagsButtonLabel', {
      defaultMessage: 'Remove tag(s)',
    }),
    showWarning: true,
    warningHeading: i18n.translate(
      'xpack.beatsManagement.tagListAssignmentOptions.removeTagsWarninigTitle',
      { defaultMessage: 'Remove tag(s)' }
    ),
    warningMessage: i18n.translate(
      'xpack.beatsManagement.tagListAssignmentOptions.removeTagWarninigMessage',
      { defaultMessage: 'Remove the tag?' }
    ),
    action: AssignmentActionType.Delete,
  },
];

export const tagConfigAssignmentOptions: AssignmentControlSchema[] = [
  {
    type: AssignmentComponentType.Action,
    danger: true,
    grow: false,
    name: i18n.translate('xpack.beatsManagement.tagConfigAssignmentOptions.removeTagsButtonLabel', {
      defaultMessage: 'Remove tag(s)',
    }),
    showWarning: true,
    warningHeading: i18n.translate(
      'xpack.beatsManagement.tagConfigAssignmentOptions.removeTagsWarninigTitle',
      { defaultMessage: 'Remove tag(s)' }
    ),
    warningMessage: i18n.translate(
      'xpack.beatsManagement.tagConfigAssignmentOptions.removeTagsWarninigMessage',
      { defaultMessage: 'Remove the tag from the selected beat(s)?' }
    ),
    action: AssignmentActionType.Delete,
  },
];
