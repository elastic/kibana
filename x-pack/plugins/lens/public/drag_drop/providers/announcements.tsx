/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DropType } from '../../types';
import { HumanData } from '.';

type AnnouncementFunction = (draggedElement: HumanData, dropElement: HumanData) => string;

interface CustomAnnouncementsType {
  dropped: Partial<{ [dropType in DropType]: AnnouncementFunction }>;
  selectedTarget: Partial<{ [dropType in DropType]: AnnouncementFunction }>;
}

const replaceCopy = {
  selectedTarget: ({ label }: HumanData, { label: dropLabel, groupLabel, position }: HumanData) =>
    i18n.translate('xpack.lens.dragDrop.announce.selectedTarget.replace', {
      defaultMessage: `Replace {dropLabel} in {groupLabel} group at position {position} with {label}. Press space or enter to replace`,
      values: {
        label,
        dropLabel,
        groupLabel,
        position,
      },
    }),
  dropped: ({ label }: HumanData, { label: dropLabel, groupLabel, position }: HumanData) =>
    i18n.translate('xpack.lens.dragDrop.announce.duplicated.replace', {
      defaultMessage: 'Replaced {dropLabel} with {label} in {groupLabel} at position {position}',
      values: {
        label,
        dropLabel,
        groupLabel,
        position,
      },
    }),
};

const duplicateCopy = {
  selectedTarget: ({ label }: HumanData, { groupLabel, position }: HumanData) =>
    i18n.translate('xpack.lens.dragDrop.announce.selectedTarget.duplicated', {
      defaultMessage: `Duplicate {label} to {groupLabel} group at position {position}. Press space or enter to duplicate`,
      values: {
        label,
        groupLabel,
        position,
      },
    }),
  dropped: ({ label }: HumanData, { groupLabel, position }: HumanData) =>
    i18n.translate('xpack.lens.dragDrop.announce.dropped.duplicated', {
      defaultMessage: 'Duplicated {label} in {groupLabel} group at position {position}',
      values: {
        label,
        groupLabel,
        position,
      },
    }),
};

const reorderCopy = {
  selectedTarget: (
    { label, groupLabel, position: prevPosition }: HumanData,
    { position }: HumanData
  ) =>
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
  dropped: ({ label, groupLabel, position: prevPosition }: HumanData, { position }: HumanData) =>
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
};

export const announcements: CustomAnnouncementsType = {
  selectedTarget: {
    reorder: reorderCopy.selectedTarget,
    duplicate_compatible: duplicateCopy.selectedTarget,
    field_replace: replaceCopy.selectedTarget,
    replace_compatible: replaceCopy.selectedTarget,
    replace_incompatible: (
      { label }: HumanData,
      { label: dropLabel, groupLabel, position, nextLabel }: HumanData
    ) =>
      i18n.translate('xpack.lens.dragDrop.announce.selectedTarget.replaceIncompatible', {
        defaultMessage: `Convert {label} to {nextLabel} and replace {dropLabel} in {groupLabel} group at position {position} v`,
        values: {
          label,
          nextLabel,
          dropLabel,
          groupLabel,
          position,
        },
      }),
    move_incompatible: ({ label }: HumanData, { groupLabel, position, nextLabel }: HumanData) =>
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

    duplicate_incompatible: (
      { label }: HumanData,
      { groupLabel, position, nextLabel }: HumanData
    ) =>
      i18n.translate('xpack.lens.dragDrop.announce.selectedTarget.duplicateIncompatible', {
        defaultMessage:
          'Convert copy of {label} to {nextLabel} and add to {groupLabel} group at position {position}. Press space or enter to duplicate',
        values: {
          label,
          groupLabel,
          position,
          nextLabel,
        },
      }),
    replace_duplicate_incompatible: (
      { label }: HumanData,
      { label: dropLabel, groupLabel, position, nextLabel }: HumanData
    ) =>
      i18n.translate('xpack.lens.dragDrop.announce.selectedTarget.replaceDuplicateIncompatible', {
        defaultMessage:
          'Convert copy of {label} to {nextLabel} and replace {dropLabel} in {groupLabel} group at position {position}. Press space or enter to duplicate and replace',
        values: {
          label,
          groupLabel,
          position,
          dropLabel,
          nextLabel,
        },
      }),
    replace_duplicate_compatible: (
      { label }: HumanData,
      { label: dropLabel, groupLabel, position }: HumanData
    ) =>
      i18n.translate('xpack.lens.dragDrop.announce.selectedTarget.replaceDuplicateCompatible', {
        defaultMessage:
          'Duplicate {label} and replace {dropLabel} in {groupLabel} at position {position}. Press space or enter to duplicate and replace',
        values: {
          label,
          dropLabel,
          groupLabel,
          position,
        },
      }),
    swap_compatible: (
      { label, groupLabel, position }: HumanData,
      { label: dropLabel, groupLabel: dropGroupLabel, position: dropPosition }: HumanData
    ) =>
      i18n.translate('xpack.lens.dragDrop.announce.selectedTarget.swapCompatible', {
        defaultMessage:
          'Swap {label} in {groupLabel} group at position {position} with {dropLabel} in {dropGroupLabel} group at position {dropPosition}. Press space or enter to swap',
        values: {
          label,
          groupLabel,
          position,
          dropLabel,
          dropGroupLabel,
          dropPosition,
        },
      }),
    swap_incompatible: (
      { label, groupLabel, position }: HumanData,
      { label: dropLabel, groupLabel: dropGroupLabel, position: dropPosition, nextLabel }: HumanData
    ) =>
      i18n.translate('xpack.lens.dragDrop.announce.selectedTarget.swapIncompatible', {
        defaultMessage:
          'Convert {label} to {nextLabel} in {groupLabel} group at position {position} and swap with {dropLabel} in {dropGroupLabel} group at position {dropPosition}. Press space or enter to swap',
        values: {
          label,
          groupLabel,
          position,
          dropLabel,
          dropGroupLabel,
          dropPosition,
          nextLabel,
        },
      }),
  },
  dropped: {
    reorder: reorderCopy.dropped,
    duplicate_compatible: duplicateCopy.dropped,
    field_replace: replaceCopy.dropped,
    replace_compatible: replaceCopy.dropped,
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

    duplicate_incompatible: (
      { label }: HumanData,
      { groupLabel, position, nextLabel }: HumanData
    ) =>
      i18n.translate('xpack.lens.dragDrop.announce.dropped.duplicateIncompatible', {
        defaultMessage:
          'Converted copy of {label} to {nextLabel} and added to {groupLabel} group at position {position}',
        values: {
          label,
          groupLabel,
          position,
          nextLabel,
        },
      }),

    replace_duplicate_incompatible: (
      { label }: HumanData,
      { label: dropLabel, groupLabel, position, nextLabel }: HumanData
    ) =>
      i18n.translate('xpack.lens.dragDrop.announce.dropped.replaceDuplicateIncompatible', {
        defaultMessage:
          'Converted copy of {label} to {nextLabel} and replaced {dropLabel} in {groupLabel} group at position {position}',
        values: {
          label,
          dropLabel,
          groupLabel,
          position,
          nextLabel,
        },
      }),
    replace_duplicate_compatible: (
      { label }: HumanData,
      { label: dropLabel, groupLabel, position }: HumanData
    ) =>
      i18n.translate('xpack.lens.dragDrop.announce.duplicated.replaceDuplicateCompatible', {
        defaultMessage:
          'Replaced {dropLabel} with a copy of {label} in {groupLabel} at position {position}',
        values: {
          label,
          dropLabel,
          groupLabel,
          position,
        },
      }),
    swap_compatible: (
      { label, groupLabel, position }: HumanData,
      { label: dropLabel, groupLabel: dropGroupLabel, position: dropPosition }: HumanData
    ) =>
      i18n.translate('xpack.lens.dragDrop.announce.dropped.swapCompatible', {
        defaultMessage:
          'Moved {label} to {dropGroupLabel} at position {dropPosition} and {dropLabel} to {groupLabel} group at position {position}',
        values: {
          label,
          groupLabel,
          position,
          dropLabel,
          dropGroupLabel,
          dropPosition,
        },
      }),
    swap_incompatible: (
      { label, groupLabel, position }: HumanData,
      { label: dropLabel, groupLabel: dropGroupLabel, position: dropPosition, nextLabel }: HumanData
    ) =>
      i18n.translate('xpack.lens.dragDrop.announce.dropped.swapIncompatible', {
        defaultMessage:
          'Converted {label} to {nextLabel} in {groupLabel} group at position {position} and swapped with {dropLabel} in {dropGroupLabel} group at position {dropPosition}',
        values: {
          label,
          groupLabel,
          position,
          dropGroupLabel,
          dropLabel,
          dropPosition,
          nextLabel,
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
