/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { AssignmentActionType } from './table';

export enum ActionComponentType {
  Action,
  Popover,
  SelectionCount,
  TagBadgeList,
}
export interface ControlSchema {
  id?: number;
  name: string;
  danger?: boolean;
  type: ActionComponentType;
  action?: AssignmentActionType;
  actionDataKey?: string;
  showWarning?: boolean;
  warningHeading?: string;
  warningMessage?: string;
  lazyLoad?: boolean;
  grow?: boolean;
}

export const beatsListActions: ControlSchema[] = [
  {
    grow: false,
    name: i18n.translate('xpack.beatsManagement.beatsListAssignmentOptions.unenrollButtonLabel', {
      defaultMessage: 'Unenroll selected Beats',
    }),
    showWarning: true,
    type: ActionComponentType.Action,
    warningHeading: i18n.translate(
      'xpack.beatsManagement.beatsListAssignmentOptions.unenrollBeatsWarninigTitle',
      { defaultMessage: 'Unenroll selected Beats?' }
    ),
    warningMessage: i18n.translate(
      'xpack.beatsManagement.beatsListAssignmentOptions.unenrollBeatsWarninigMessage',
      { defaultMessage: 'The selected Beats will no longer use central management.' }
    ),
    action: AssignmentActionType.Delete,
    danger: true,
  },
  {
    name: i18n.translate('xpack.beatsManagement.beatsListAssignmentOptions.setTagsButtonLabel', {
      defaultMessage: 'Set tags',
    }),
    grow: false,
    type: ActionComponentType.TagBadgeList,
    actionDataKey: 'tags',
    lazyLoad: true,
  },
];

export const tagListActions: ControlSchema[] = [
  {
    danger: true,
    grow: false,
    name: i18n.translate('xpack.beatsManagement.tagListAssignmentOptions.removeTagsButtonLabel', {
      defaultMessage: 'Delete selected tags',
    }),
    type: ActionComponentType.Action,
    showWarning: true,
    warningHeading: i18n.translate(
      'xpack.beatsManagement.tagListAssignmentOptions.removeTagsWarninigTitle',
      { defaultMessage: 'Delete selected tags?' }
    ),
    warningMessage: i18n.translate(
      'xpack.beatsManagement.tagListAssignmentOptions.removeTagWarninigMessage',
      { defaultMessage: 'The tag and all its configuration blocks will be deleted.' }
    ),
    action: AssignmentActionType.Delete,
  },
];

export const tagConfigActions: ControlSchema[] = [
  {
    danger: true,
    grow: false,
    name: i18n.translate('xpack.beatsManagement.tagConfigAssignmentOptions.removeTagsButtonLabel', {
      defaultMessage: 'Remove tag',
    }),
    type: ActionComponentType.Action,
    showWarning: true,
    warningHeading: i18n.translate(
      'xpack.beatsManagement.tagConfigAssignmentOptions.removeTagsWarninigTitle',
      { defaultMessage: 'Remove tag?' }
    ),
    warningMessage: i18n.translate(
      'xpack.beatsManagement.tagConfigAssignmentOptions.removeTagsWarninigMessage',
      { defaultMessage: 'The tag will be removed from the selected Beats.' }
    ),
    action: AssignmentActionType.Delete,
  },
];
