/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

type ActionType = 'lifted' | 'cancelled' | 'selectedTarget' | 'dropped';

// draggingElement: label, groupLabel, position
// droppingElement: label, groupLabel, position

export interface HumanData {
  label: string;
  groupLabel?: string;
  position?: number;
}

const defaultAnnouncements = {
  blockedArrows: ()=> {
    return i18n.translate('xpack.lens.dragDrop.finishReordering', {
      defaultMessage:
        'You have started reordering and you cannot choose any external target now. Press escape to cancel and try again.',
    })
  },
  lifted: ({ label }) => {
    return i18n.translate('xpack.lens.dragDrop.liftedAnnounce', {
      defaultMessage: `You have lifted an item {label}`,
      values: {
        label,
      },
    });
  },
  cancelled: ({ label }) => {
    return i18n.translate('xpack.lens.dragDrop.cancelledAnnounce', {
      defaultMessage: 'Movement cancelled',
      values: {
        label,
      },
    });
  },
  dropped: (dragging, dropTarget) => {
    const { label } = dragging;
    const { groupLabel, position, label: dropLabel } = dropTarget;
    if (groupLabel && position) {
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
  selectedTarget: ({ label, groupLabel }, dropTarget) => {
    const { label: dropTargetLabel, groupLabel: dropTargetGroupLabel, position } = dropTarget;
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

export const announcements = {
  reorder: {
    ...defaultAnnouncements,
    selectedTarget: (dragged, drop) => {
      const { label, position: prevPosition } = dragged;
      const { position } = drop;
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
    dropped: ({ label, position: prevPosition }, { position }) =>
      i18n.translate('xpack.lens.dragDrop.dropMessageReorder', {
        defaultMessage:
          'You have dropped the item {label}. You have moved the item from position {prevPosition} to positon {position}',
        values: {
          label,
          position,
          prevPosition,
        },
      }),
  },
  duplicateInGroup: {
    ...defaultAnnouncements,
    selectedTarget: ({ label }, { label: targetLabel, groupLabel, position }) =>
      i18n.translate('xpack.lens.dragDrop.elementMoved', {
        defaultMessage: `You have selected {targetLabel} in {groupLabel} group in position {position}. Press space or enter to duplicate the item.`,
        values: {
          targetLabel,
          label,
          groupLabel,
          position,
        },
      }),
    dropped: (dragging, dropTarget) => {
      const { label } = dragging;
      const { groupLabel, position } = dropTarget;
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

export const announce = (
  actionType: ActionType,
  dropType: 'reorder' | undefined,
  draggingElement: HumanData,
  droppingElement?: HumanData
) => {
  const announcement = announcements?.[dropType]?.[actionType] || defaultAnnouncements[actionType];
  console.log(
    `%c ${announcement(draggingElement, droppingElement)}`,
    'background: #251e3e; color: #eee3e7'
  );
  return announcement(draggingElement, droppingElement);
};
