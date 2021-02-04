/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DropType } from '../types';
export interface HumanData {
  label: string;
  groupLabel?: string;
  position?: number;
}

type AnnouncementFunction = (draggedElement: HumanData, dropElement: HumanData) => string;

interface CustomAnnouncementsType {
  dropped: Partial<{ [dropType in DropType]: AnnouncementFunction }>;
  selectedTarget: Partial<{ [dropType in DropType]: AnnouncementFunction }>;
}

const selectedTargetReplace = (
  { label }: HumanData,
  { label: dropLabel, groupLabel, position }: HumanData
) =>
  i18n.translate('xpack.lens.dragDrop.announce.selectedTarget.replace', {
    defaultMessage: `You have selected {dropLabel} in {groupLabel} group in position {position}. Press space or enter to replace {dropLabel} with {label}.`,
    values: {
      label,
      dropLabel,
      groupLabel,
      position,
    },
  });

const droppedReplace = ({ label }: HumanData, { label: dropLabel, groupLabel }: HumanData) =>
  i18n.translate('xpack.lens.dragDrop.announce.duplicated.replace', {
    defaultMessage:
      'You have dropped the item. You have replaced {dropLabel} with {label} in {groupLabel} group.',
    values: {
      label,
      dropLabel,
      groupLabel,
    },
  });

export const announcements: CustomAnnouncementsType = {
  selectedTarget: {
    reorder: ({ label, position: prevPosition }, { position }) =>
      prevPosition === position
        ? i18n.translate('xpack.lens.dragDrop.announce.selectedTarget.reorderedBack', {
            defaultMessage: `You have moved the item {label} back to position {prevPosition}`,
            values: {
              label,
              prevPosition,
            },
          })
        : i18n.translate('xpack.lens.dragDrop.announce.selectedTarget.reordered', {
            defaultMessage: `You have moved the item {label} from position {prevPosition} to position {position}`,
            values: {
              label,
              position,
              prevPosition,
            },
          }),
    duplicate_in_group: ({ label }, { label: dropLabel, groupLabel, position }) =>
      i18n.translate('xpack.lens.dragDrop.announce.selectedTarget.duplicated', {
        defaultMessage: `You have selected {dropLabel} in {groupLabel} group in position {position}. Press space or enter to duplicate {label}.`,
        values: {
          label,
          dropLabel,
          groupLabel,
          position,
        },
      }),
    field_replace: selectedTargetReplace,
    replace_compatible: selectedTargetReplace,
    replace_incompatible: selectedTargetReplace,
  },
  dropped: {
    reorder: ({ label, position: prevPosition }, { position }) =>
      i18n.translate('xpack.lens.dragDrop.announce.dropped.reordered', {
        defaultMessage:
          'You have dropped the item {label}. You have moved the item from position {prevPosition} to positon {position}',
        values: {
          label,
          position,
          prevPosition,
        },
      }),
    duplicate_in_group: ({ label }, { groupLabel, position }) =>
      i18n.translate('xpack.lens.dragDrop.announce.dropped.duplicated', {
        defaultMessage:
          'You have dropped the item. You have duplicated {label} in {groupLabel} group in position {position}',
        values: {
          label,
          groupLabel,
          position,
        },
      }),
    field_replace: droppedReplace,
    replace_compatible: droppedReplace,
    replace_incompatible: droppedReplace,
  },
};

const defaultAnnouncements = {
  lifted: ({ label }: HumanData) =>
    i18n.translate('xpack.lens.dragDrop.announce.lifted', {
      defaultMessage: `You have lifted an item {label}`,
      values: {
        label,
      },
    }),
  cancelled: () =>
    i18n.translate('xpack.lens.dragDrop.announce.cancelled', {
      defaultMessage: 'Movement cancelled',
    }),
  noTarget: () => {
    return i18n.translate('xpack.lens.dragDrop.announce.selectedTarget.noSelected', {
      defaultMessage: `You have no target selected. Use arrow keys to select a target.`,
    });
  },

  dropped: (
    { label }: HumanData,
    { groupLabel: dropGroupLabel, position, label: dropLabel }: HumanData
  ) =>
    dropGroupLabel && position
      ? i18n.translate('xpack.lens.dragDrop.announce.droppedDefault', {
          defaultMessage:
            'You have dropped {label} to {dropLabel} in {dropGroupLabel} group in position {position}',
          values: {
            label,
            dropGroupLabel,
            position,
            dropLabel,
          },
        })
      : i18n.translate('xpack.lens.dragDrop.announce.droppedNoPosition', {
          defaultMessage: 'You have dropped {label} to {dropLabel}',
          values: {
            label,
            dropLabel,
          },
        }),
  selectedTarget: (
    { label }: HumanData,
    { label: dropLabel, groupLabel: dropGroupLabel, position }: HumanData
  ) => {
    return dropGroupLabel && position
      ? i18n.translate('xpack.lens.dragDrop.announce.selectedTarget.default', {
          defaultMessage: `You have selected {dropLabel} in {dropGroupLabel} group in position {position}. Press space or enter to drop {label}`,
          values: {
            dropLabel,
            label,
            dropGroupLabel,
            position,
          },
        })
      : i18n.translate('xpack.lens.dragDrop.announce.selectedTarget.defaultNoPosition', {
          defaultMessage: `You have selected {dropLabel}. Press space or enter to drop {label}`,
          values: {
            dropLabel,
            label,
          },
        });
  },
};

export const announce = {
  ...defaultAnnouncements,
  dropped: (draggedElement: HumanData, dropElement: HumanData, type?: DropType) =>
    (type && announcements.dropped?.[type]?.(draggedElement, dropElement)) ||
    defaultAnnouncements.dropped(draggedElement, dropElement),
  selectedTarget: (draggedElement: HumanData, dropElement: HumanData, type?: DropType) =>
    (type && announcements.selectedTarget?.[type]?.(draggedElement, dropElement)) ||
    defaultAnnouncements.selectedTarget(draggedElement, dropElement),
};
