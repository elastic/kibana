/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DropType } from '../../types';
import { HumanData } from '.';

type AnnouncementFunction = (
  draggedElement: HumanData,
  dropElement: HumanData,
  announceModifierKeys?: boolean
) => string;

interface CustomAnnouncementsType {
  dropped: Partial<{ [dropType in DropType]: AnnouncementFunction }>;
  selectedTarget: Partial<{ [dropType in DropType]: AnnouncementFunction }>;
}

const replaceAnnouncement = {
  selectedTarget: (
    { label, groupLabel, position }: HumanData,
    {
      label: dropLabel,
      groupLabel: dropGroupLabel,
      position: dropPosition,
      canSwap,
      canDuplicate,
    }: HumanData,
    announceModifierKeys?: boolean
  ) => {
    if (announceModifierKeys && (canSwap || canDuplicate)) {
      return i18n.translate('xpack.lens.dragDrop.announce.selectedTarget.replaceMain', {
        defaultMessage: `You're dragging {label} from {groupLabel} at position {position} over {dropLabel} from {dropGroupLabel} group at position {dropPosition}. Press space or enter to replace {dropLabel} with {label}.{duplicateCopy}{swapCopy}`,
        values: {
          label,
          groupLabel,
          position,
          dropLabel,
          dropGroupLabel,
          dropPosition,
          duplicateCopy: canDuplicate ? DUPLICATE_SHORT : '',
          swapCopy: canSwap ? SWAP_SHORT : '',
        },
      });
    }

    return i18n.translate('xpack.lens.dragDrop.announce.selectedTarget.replace', {
      defaultMessage: `Replace {dropLabel} in {dropGroupLabel} group at position {dropPosition} with {label}. Press space or enter to replace.`,
      values: {
        label,
        dropLabel,
        dropGroupLabel,
        dropPosition,
      },
    });
  },
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

const duplicateAnnouncement = {
  selectedTarget: (
    { label, groupLabel }: HumanData,
    { groupLabel: dropGroupLabel, position }: HumanData
  ) => {
    if (groupLabel !== dropGroupLabel) {
      return i18n.translate('xpack.lens.dragDrop.announce.selectedTarget.duplicated', {
        defaultMessage: `Duplicate {label} to {dropGroupLabel} group at position {position}. Hold Alt or Option and press space or enter to duplicate`,
        values: {
          label,
          dropGroupLabel,
          position,
        },
      });
    }
    return i18n.translate('xpack.lens.dragDrop.announce.selectedTarget.duplicatedInGroup', {
      defaultMessage: `Duplicate {label} to {dropGroupLabel} group at position {position}. Press space or enter to duplicate`,
      values: {
        label,
        dropGroupLabel,
        position,
      },
    });
  },
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

const reorderAnnouncement = {
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
        'Reordered {label} in {groupLabel} group from position {prevPosition} to position {position}',
      values: {
        label,
        groupLabel,
        position,
        prevPosition,
      },
    }),
};

const combineAnnouncement = {
  selectedTarget: (
    { label, groupLabel, position }: HumanData,
    {
      label: dropLabel,
      groupLabel: dropGroupLabel,
      position: dropPosition,
      canSwap,
      canDuplicate,
      canCombine,
    }: HumanData,
    announceModifierKeys?: boolean
  ) => {
    if (announceModifierKeys && (canSwap || canDuplicate || canCombine)) {
      return i18n.translate('xpack.lens.dragDrop.announce.selectedTarget.combineMain', {
        defaultMessage: `You're dragging {label} from {groupLabel} at position {position} over {dropLabel} from {dropGroupLabel} group at position {dropPosition}. Press space or enter to combine {dropLabel} with {label}.{duplicateCopy}{swapCopy}{combineCopy}`,
        values: {
          label,
          groupLabel,
          position,
          dropLabel,
          dropGroupLabel,
          dropPosition,
          duplicateCopy: canDuplicate ? DUPLICATE_SHORT : '',
          swapCopy: canSwap ? SWAP_SHORT : '',
          combineCopy: canCombine ? COMBINE_SHORT : '',
        },
      });
    }

    return i18n.translate('xpack.lens.dragDrop.announce.selectedTarget.combine', {
      defaultMessage: `Combine {dropLabel} in {dropGroupLabel} group at position {dropPosition} with {label}. Press space or enter to combine.`,
      values: {
        label,
        dropLabel,
        dropGroupLabel,
        dropPosition,
      },
    });
  },
  dropped: ({ label }: HumanData, { label: dropLabel, groupLabel, position }: HumanData) =>
    i18n.translate('xpack.lens.dragDrop.announce.duplicated.combine', {
      defaultMessage: 'Combine {dropLabel} with {label} in {groupLabel} at position {position}',
      values: {
        label,
        dropLabel,
        groupLabel,
        position,
      },
    }),
};

const DUPLICATE_SHORT = i18n.translate('xpack.lens.dragDrop.announce.duplicate.short', {
  defaultMessage: ' Hold alt or option to duplicate.',
});

const SWAP_SHORT = i18n.translate('xpack.lens.dragDrop.announce.swap.short', {
  defaultMessage: ' Hold shift to swap.',
});

const COMBINE_SHORT = i18n.translate('xpack.lens.dragDrop.announce.combine.short', {
  defaultMessage: ' Hold control to combine',
});

export const announcements: CustomAnnouncementsType = {
  selectedTarget: {
    reorder: reorderAnnouncement.selectedTarget,
    duplicate_compatible: duplicateAnnouncement.selectedTarget,
    field_replace: replaceAnnouncement.selectedTarget,
    field_combine: combineAnnouncement.selectedTarget,
    replace_compatible: replaceAnnouncement.selectedTarget,
    replace_incompatible: (
      { label, groupLabel, position }: HumanData,
      {
        label: dropLabel,
        groupLabel: dropGroupLabel,
        position: dropPosition,
        nextLabel,
        canSwap,
        canDuplicate,
      }: HumanData,
      announceModifierKeys?: boolean
    ) => {
      if (announceModifierKeys && (canSwap || canDuplicate)) {
        return i18n.translate(
          'xpack.lens.dragDrop.announce.selectedTarget.replaceIncompatibleMain',
          {
            defaultMessage: `You're dragging {label} from {groupLabel} at position {position} over {dropLabel} from {dropGroupLabel} group at position {dropPosition}. Press space or enter to convert {label} to {nextLabel} and replace {dropLabel}.{duplicateCopy}{swapCopy}`,
            values: {
              label,
              groupLabel,
              position,
              dropLabel,
              dropGroupLabel,
              dropPosition,
              nextLabel,
              duplicateCopy: canDuplicate ? DUPLICATE_SHORT : '',
              swapCopy: canSwap ? SWAP_SHORT : '',
            },
          }
        );
      }
      return i18n.translate('xpack.lens.dragDrop.announce.selectedTarget.replaceIncompatible', {
        defaultMessage: `Convert {label} to {nextLabel} and replace {dropLabel} in {dropGroupLabel} group at position {dropPosition}. Press space or enter to replace`,
        values: {
          label,
          nextLabel,
          dropLabel,
          dropGroupLabel,
          dropPosition,
        },
      });
    },
    move_incompatible: (
      { label, groupLabel, position }: HumanData,
      {
        groupLabel: dropGroupLabel,
        position: dropPosition,
        nextLabel,
        canSwap,
        canDuplicate,
      }: HumanData,
      announceModifierKeys?: boolean
    ) => {
      if (announceModifierKeys && (canSwap || canDuplicate)) {
        return i18n.translate('xpack.lens.dragDrop.announce.selectedTarget.moveIncompatibleMain', {
          defaultMessage: `You're dragging {label} from {groupLabel} at position {position} over position {dropPosition} in {dropGroupLabel} group. Press space or enter to convert {label} to {nextLabel} and move.{duplicateCopy}{swapCopy}`,
          values: {
            label,
            groupLabel,
            position,
            dropGroupLabel,
            dropPosition,
            nextLabel,
            duplicateCopy: canDuplicate ? DUPLICATE_SHORT : '',
            swapCopy: canSwap ? SWAP_SHORT : '',
          },
        });
      }
      return i18n.translate('xpack.lens.dragDrop.announce.selectedTarget.moveIncompatible', {
        defaultMessage: `Convert {label} to {nextLabel} and move to {dropGroupLabel} group at position {dropPosition}. Press space or enter to move`,
        values: {
          label,
          nextLabel,
          dropGroupLabel,
          dropPosition,
        },
      });
    },

    move_compatible: (
      { label, groupLabel, position }: HumanData,
      { groupLabel: dropGroupLabel, position: dropPosition, canSwap, canDuplicate }: HumanData,
      announceModifierKeys?: boolean
    ) => {
      if (announceModifierKeys && (canSwap || canDuplicate)) {
        return i18n.translate('xpack.lens.dragDrop.announce.selectedTarget.moveCompatibleMain', {
          defaultMessage: `You're dragging {label} from {groupLabel} at position {position} over position {dropPosition} in {dropGroupLabel} group. Press space or enter to move.{duplicateCopy}{swapCopy}`,
          values: {
            label,
            groupLabel,
            position,
            dropGroupLabel,
            dropPosition,
            duplicateCopy: canDuplicate ? DUPLICATE_SHORT : '',
            swapCopy: canSwap ? SWAP_SHORT : '',
          },
        });
      }
      return i18n.translate('xpack.lens.dragDrop.announce.selectedTarget.moveCompatible', {
        defaultMessage: `Move {label} to {dropGroupLabel} group at position {dropPosition}. Press space or enter to move`,
        values: {
          label,
          dropGroupLabel,
          dropPosition,
        },
      });
    },
    duplicate_incompatible: (
      { label }: HumanData,
      { groupLabel, position, nextLabel }: HumanData
    ) =>
      i18n.translate('xpack.lens.dragDrop.announce.selectedTarget.duplicateIncompatible', {
        defaultMessage:
          'Convert copy of {label} to {nextLabel} and add to {groupLabel} group at position {position}. Hold Alt or Option and press space or enter to duplicate',
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
          'Convert copy of {label} to {nextLabel} and replace {dropLabel} in {groupLabel} group at position {position}. Hold Alt or Option and press space or enter to duplicate and replace',
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
          'Duplicate {label} and replace {dropLabel} in {groupLabel} at position {position}. Hold Alt or Option and press space or enter to duplicate and replace',
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
          'Swap {label} in {groupLabel} group at position {position} with {dropLabel} in {dropGroupLabel} group at position {dropPosition}. Hold Shift and press space or enter to swap',
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
          'Convert {label} to {nextLabel} in {groupLabel} group at position {position} and swap with {dropLabel} in {dropGroupLabel} group at position {dropPosition}. Hold Shift and press space or enter to swap',
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
    combine_compatible: (
      { label, groupLabel, position }: HumanData,
      { label: dropLabel, groupLabel: dropGroupLabel, position: dropPosition, nextLabel }: HumanData
    ) =>
      i18n.translate('xpack.lens.dragDrop.announce.selectedTarget.combineCompatible', {
        defaultMessage:
          'Combine {label} in {groupLabel} group at position {position} with {dropLabel} in {dropGroupLabel} group at position {dropPosition}. Hold Control and press space or enter to combine',
        values: {
          label,
          groupLabel,
          position,
          dropLabel,
          dropGroupLabel,
          dropPosition,
        },
      }),
    combine_incompatible: (
      { label, groupLabel, position }: HumanData,
      { label: dropLabel, groupLabel: dropGroupLabel, position: dropPosition, nextLabel }: HumanData
    ) =>
      i18n.translate('xpack.lens.dragDrop.announce.selectedTarget.combineIncompatible', {
        defaultMessage:
          'Convert {label} to {nextLabel} in {groupLabel} group at position {position} and combine with {dropLabel} in {dropGroupLabel} group at position {dropPosition}. Hold Control and press space or enter to combine',
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
    reorder: reorderAnnouncement.dropped,
    duplicate_compatible: duplicateAnnouncement.dropped,
    field_replace: replaceAnnouncement.dropped,
    field_combine: combineAnnouncement.dropped,
    replace_compatible: replaceAnnouncement.dropped,
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
    combine_compatible: (
      { label, groupLabel, position }: HumanData,
      { label: dropLabel, groupLabel: dropGroupLabel, position: dropPosition }: HumanData
    ) =>
      i18n.translate('xpack.lens.dragDrop.announce.dropped.combineCompatible', {
        defaultMessage:
          'Combined {label} to {dropGroupLabel} at position {dropPosition} and {dropLabel} to {groupLabel} group at position {position}',
        values: {
          label,
          groupLabel,
          position,
          dropLabel,
          dropGroupLabel,
          dropPosition,
        },
      }),
    combine_incompatible: (
      { label, groupLabel, position }: HumanData,
      { label: dropLabel, groupLabel: dropGroupLabel, position: dropPosition, nextLabel }: HumanData
    ) =>
      i18n.translate('xpack.lens.dragDrop.announce.dropped.combineIncompatible', {
        defaultMessage:
          'Converted {label} to {nextLabel} in {groupLabel} group at position {position} and combined with {dropLabel} in {dropGroupLabel} group at position {dropPosition}',
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
  selectedTarget: (
    draggedElement: HumanData,
    dropElement: HumanData,
    type?: DropType,
    announceModifierKeys?: boolean
  ) =>
    (type &&
      announcements.selectedTarget?.[type]?.(draggedElement, dropElement, announceModifierKeys)) ||
    defaultAnnouncements.selectedTarget(draggedElement, dropElement),
};
