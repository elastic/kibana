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
  nextLabel?: string;
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
    defaultMessage: `Replace {dropLabel} in {groupLabel} group at position {position} with {label}. Press space or enter to replace`,
    values: {
      label,
      dropLabel,
      groupLabel,
      position,
    },
  });

const droppedReplace = (
  { label }: HumanData,
  { label: dropLabel, groupLabel, position }: HumanData
) =>
  i18n.translate('xpack.lens.dragDrop.announce.duplicated.replace', {
    defaultMessage: 'Replaced {dropLabel} with {label} in {groupLabel} at position {position}',
    values: {
      label,
      dropLabel,
      groupLabel,
      position,
    },
  });

export const announcements: CustomAnnouncementsType = {
  selectedTarget: {
    reorder: ({ label, groupLabel, position: prevPosition }, { position }) =>
      prevPosition === position
        ? i18n.translate('xpack.lens.dragDrop.announce.selectedTarget.reorderedBack', {
            defaultMessage: `{label} returned to its initial position {prevPosition}`,
            values: {
              label,
              prevPosition,
            },
          })
        : i18n.translate('xpack.lens.dragDrop.announce.selectedTarget.reordered', {
            defaultMessage: `Reorder {label} in {groupLabel} group from position {prevPosition} to position {position}. Press space or enter to reorder`,
            values: {
              groupLabel,
              label,
              position,
              prevPosition,
            },
          }),
    duplicate_in_group: ({ label }, { groupLabel, position }) =>
      i18n.translate('xpack.lens.dragDrop.announce.selectedTarget.duplicated', {
        defaultMessage: `Duplicate {label} to {groupLabel} group at position {position}. Press space or enter to duplicate`,
        values: {
          label,
          groupLabel,
          position,
        },
      }),
    field_replace: selectedTargetReplace,
    replace_compatible: selectedTargetReplace,
    replace_incompatible: (
      { label }: HumanData,
      { label: dropLabel, groupLabel, position, nextLabel }: HumanData
    ) =>
      i18n.translate('xpack.lens.dragDrop.announce.selectedTarget.replaceIncompatible', {
        defaultMessage: `Convert {label} to {nextLabel} and replace {dropLabel} in {groupLabel} group at position {position}. Press space or enter to replace`,
        values: {
          label,
          nextLabel,
          dropLabel,
          groupLabel,
          position,
        },
      }),
    move_incompatible: (
      { label }: HumanData,
      { label: groupLabel, position, nextLabel }: HumanData
    ) =>
      i18n.translate('xpack.lens.dragDrop.announce.selectedTarget.moveIncompatible', {
        defaultMessage: `Convert {label} to {nextLabel} and move to {groupLabel} group at position {position}. Press space or enter to move`,
        values: {
          label,
          nextLabel,
          groupLabel,
          position,
        },
      }),
    move_compatible: ({ label }: HumanData, { groupLabel, position }: HumanData) =>
      i18n.translate('xpack.lens.dragDrop.announce.selectedTarget.moveCompatible', {
        defaultMessage: `Move {label} to {groupLabel} group at position {position}. Press space or enter to move`,
        values: {
          label,
          groupLabel,
          position,
        },
      }),
  },
  dropped: {
    reorder: ({ label, groupLabel, position: prevPosition }, { position }) =>
      i18n.translate('xpack.lens.dragDrop.announce.dropped.reordered', {
        defaultMessage:
          'Reordered {label} in {groupLabel} group from position {prevPosition} to positon {position}',
        values: {
          label,
          groupLabel,
          position,
          prevPosition,
        },
      }),
    duplicate_in_group: ({ label }, { groupLabel, position }) =>
      i18n.translate('xpack.lens.dragDrop.announce.dropped.duplicated', {
        defaultMessage: 'Duplicated {label} in {groupLabel} group at position {position}',
        values: {
          label,
          groupLabel,
          position,
        },
      }),
    field_replace: droppedReplace,
    replace_compatible: droppedReplace,
    replace_incompatible: (
      { label }: HumanData,
      { label: dropLabel, groupLabel, position, nextLabel }: HumanData
    ) =>
      i18n.translate('xpack.lens.dragDrop.announce.dropped.replaceIncompatible', {
        defaultMessage:
          'Converted {label} to {nextLabel} and replaced {dropLabel} in {groupLabel} group at position {position}',
        values: {
          label,
          nextLabel,
          dropLabel,
          groupLabel,
          position,
        },
      }),
    move_incompatible: ({ label }: HumanData, { groupLabel, position, nextLabel }: HumanData) =>
      i18n.translate('xpack.lens.dragDrop.announce.dropped.moveIncompatible', {
        defaultMessage:
          'Converted {label} to {nextLabel} and moved to {groupLabel} group at position {position}',
        values: {
          label,
          nextLabel,
          groupLabel,
          position,
        },
      }),

    move_compatible: ({ label }: HumanData, { groupLabel, position }: HumanData) =>
      i18n.translate('xpack.lens.dragDrop.announce.dropped.moveCompatible', {
        defaultMessage: 'Moved {label} to {groupLabel} group at position {position}',
        values: {
          label,
          groupLabel,
          position,
        },
      }),
  },
};

const defaultAnnouncements = {
  lifted: ({ label }: HumanData) =>
    i18n.translate('xpack.lens.dragDrop.announce.lifted', {
      defaultMessage: `Lifted {label}`,
      values: {
        label,
      },
    }),
  cancelled: ({ label, groupLabel, position }: HumanData) => {
    if (!groupLabel || !position) {
      return i18n.translate('xpack.lens.dragDrop.announce.cancelled', {
        defaultMessage: 'Movement cancelled. {label} returned to its initial position',
        values: {
          label,
        },
      });
    }
    return i18n.translate('xpack.lens.dragDrop.announce.cancelledItem', {
      defaultMessage:
        'Movement cancelled. {label} returned to {groupLabel} group at position {position}',
      values: {
        label,
        groupLabel,
        position,
      },
    });
  },

  noTarget: () => {
    return i18n.translate('xpack.lens.dragDrop.announce.selectedTarget.noSelected', {
      defaultMessage: `No target selected. Use arrow keys to select a target`,
    });
  },

  dropped: (
    { label }: HumanData,
    { groupLabel: dropGroupLabel, position, label: dropLabel }: HumanData
  ) =>
    dropGroupLabel && position
      ? i18n.translate('xpack.lens.dragDrop.announce.droppedDefault', {
          defaultMessage: 'Added {label} in {dropGroupLabel} group at position {position}',
          values: {
            label,
            dropGroupLabel,
            position,
          },
        })
      : i18n.translate('xpack.lens.dragDrop.announce.droppedNoPosition', {
          defaultMessage: 'Added {label} to {dropLabel}',
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
          defaultMessage: `Add {label} to {dropGroupLabel} group at position {position}. Press space or enter to add`,
          values: {
            label,
            dropGroupLabel,
            position,
          },
        })
      : i18n.translate('xpack.lens.dragDrop.announce.selectedTarget.defaultNoPosition', {
          defaultMessage: `Add {label} to {dropLabel}. Press space or enter to add`,
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
