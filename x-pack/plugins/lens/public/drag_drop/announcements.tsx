/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { DropType } from '../types';

type ActionType = 'lifted' | 'cancelled' | 'selectedTarget' | 'dropped' | 'blockedArrows';
export interface HumanData {
  label: string;
  groupLabel?: string;
  position?: number;
}

type AnnouncementFunction = (
  type: DropType | undefined,
  draggedElement: HumanData,
  dropElement: HumanData
) => string;

interface CustomAnnouncementsType {
  dropped: Partial<{ [dropType in DropType]: AnnouncementFunction }>;
  selectedTarget: Partial<{ [dropType in DropType]: AnnouncementFunction }>;
}

export const announcements: CustomAnnouncementsType = {
  selectedTarget: {
    reorder: (type, draggedElement, dropElement) => {
      const { label, position: prevPosition } = draggedElement;
      const { position } = dropElement;
      if (prevPosition === position) {
        return i18n.translate('xpack.lens.dragDrop.elementReturned', {
          defaultMessage: `You have moved the item {label} back to position {prevPosition}`,
          values: {
            label,
            prevPosition,
          },
        });
      }
      return i18n.translate('xpack.lens.dragDrop.elementMoved', {
        defaultMessage: `You have moved the item {label} from position {prevPosition} to position {position}`,
        values: {
          label,
          position,
          prevPosition,
        },
      });
    },
    duplicate_in_group: (type, draggedElement, dropElement) => {
      const { label } = draggedElement;
      const { label: targetLabel, groupLabel, position } = dropElement;
      return i18n.translate('xpack.lens.dragDrop.elementMoved', {
        defaultMessage: `You have selected {targetLabel} in {groupLabel} group in position {position}. Press space or enter to duplicate the item.`,
        values: {
          targetLabel,
          label,
          groupLabel,
          position,
        },
      });
    },
  },
  dropped: {
    reorder: (type, { label, position: prevPosition }, { position }) =>
      i18n.translate('xpack.lens.dragDrop.dropMessageReorder', {
        defaultMessage:
          'You have dropped the item {label}. You have moved the item from position {prevPosition} to positon {position}',
        values: {
          label,
          position,
          prevPosition,
        },
      }),
    duplicate_in_group: (type, draggedElement, dropElement) => {
      const { label } = draggedElement;
      const { groupLabel, position } = dropElement;
      return i18n.translate('xpack.lens.dragDrop.droppedAnnounce', {
        defaultMessage:
          'You have dropped the item. You have duplicated {label} in {groupLabel} group in position {position}',
        values: {
          label,
          groupLabel,
          position,
        },
      });
    },
  },
};

const defaultAnnouncements: {
  [actionType in ActionType]: (...args: any[]) => string; // eslint-disable-line @typescript-eslint/no-explicit-any
} = {
  blockedArrows: () => {
    return i18n.translate('xpack.lens.dragDrop.finishReordering', {
      defaultMessage:
        'You have started reordering and you cannot choose any external target now. Press escape to cancel and try again.',
    });
  },
  lifted: ({ label }: HumanData) => {
    return i18n.translate('xpack.lens.dragDrop.liftedAnnounce', {
      defaultMessage: `You have lifted an item {label}`,
      values: {
        label,
      },
    });
  },
  cancelled: () => {
    return i18n.translate('xpack.lens.dragDrop.cancelledAnnounce', {
      defaultMessage: 'Movement cancelled',
    });
  },
  dropped: (type: DropType | undefined, draggedElement: HumanData, dropElement: HumanData) => {
    const { label } = draggedElement;
    const { groupLabel, position, label: dropLabel } = dropElement;
    if (dropElement.groupLabel && dropElement.position) {
      return i18n.translate('xpack.lens.dragDrop.droppedAnnounceAll', {
        defaultMessage:
          'You have dropped {label} to {dropLabel} in {groupLabel} group in position {position}',
        values: {
          label,
          groupLabel,
          position,
          dropLabel,
        },
      });
    }
    return i18n.translate('xpack.lens.dragDrop.droppedAnnounceLabel', {
      defaultMessage: 'You have dropped {label} to {dropLabel}',
      values: {
        label,
        dropLabel,
      },
    });
  },
  selectedTarget: (
    type: DropType | undefined,
    { label, groupLabel }: HumanData,
    { label: dropTargetLabel, groupLabel: dropTargetGroupLabel, position }: HumanData
  ) => {
    if (label === dropTargetLabel && groupLabel === dropTargetGroupLabel) {
      return i18n.translate('xpack.lens.dragDrop.elementUnselected', {
        defaultMessage: `You have no target selected. Use arros keys to select a target.`,
      });
    }
    return groupLabel && position
      ? i18n.translate('xpack.lens.dragDrop.elementMovedAnnounceAll', {
          defaultMessage: `You have selected {dropTargetLabel} in {dropTargetGroupLabel} group in position {position}. Press space or enter to drop {label}`,
          values: {
            dropTargetLabel,
            label,
            dropTargetGroupLabel,
            position,
          },
        })
      : i18n.translate('xpack.lens.dragDrop.elementMovedAnnounceLabel', {
          defaultMessage: `You have selected {dropTargetLabel}. Press space or enter to drop {label}`,
          values: {
            dropTargetLabel,
            label,
          },
        });
  },
};

export const announce = {
  blockedArrows: defaultAnnouncements.blockedArrows,
  lifted: defaultAnnouncements.lifted,
  cancelled: defaultAnnouncements.cancelled,
  dropped: (type: DropType | undefined, ...rest: [HumanData, HumanData]) => {
    return (
      (type &&
        announcements.dropped[type] &&
        typeof announcements.dropped[type] === 'function' &&
        announcements.dropped[type]?.(type, ...rest)) ||
      defaultAnnouncements.dropped(type, ...rest)
    );
  },
  selectedTarget: (type: DropType | undefined, ...rest: [HumanData, HumanData]) => {
    return (
      (type &&
        announcements.selectedTarget[type] &&
        typeof announcements.selectedTarget[type] === 'function' &&
        announcements.selectedTarget[type]?.(type, ...rest)) ||
      defaultAnnouncements.selectedTarget(type, ...rest)
    );
  },
};
