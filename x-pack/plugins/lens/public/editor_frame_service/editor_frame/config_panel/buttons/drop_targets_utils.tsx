/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import classNames from 'classnames';
import { EuiIcon, EuiFlexItem, EuiFlexGroup, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DragDropIdentifier, DraggingIdentifier } from '../../../../drag_drop';
import {
  Datasource,
  DropType,
  FramePublicAPI,
  GetDropPropsArgs,
  isOperation,
  Visualization,
  DragDropOperation,
  VisualizationDimensionGroupConfig,
} from '../../../../types';

function getPropsForDropType(type: 'swap' | 'duplicate' | 'combine') {
  switch (type) {
    case 'duplicate':
      return {
        icon: 'copy',
        label: i18n.translate('xpack.lens.dragDrop.duplicate', {
          defaultMessage: 'Duplicate',
        }),
        controlKey: i18n.translate('xpack.lens.dragDrop.altOption', {
          defaultMessage: 'Alt/Option',
        }),
      };

    case 'swap':
      return {
        icon: 'merge',
        label: i18n.translate('xpack.lens.dragDrop.swap', {
          defaultMessage: 'Swap',
        }),
        controlKey: i18n.translate('xpack.lens.dragDrop.shift', {
          defaultMessage: 'Shift',
        }),
      };
    case 'combine':
      return {
        icon: 'aggregate',
        label: i18n.translate('xpack.lens.dragDrop.combine', {
          defaultMessage: 'Combine',
        }),
        controlKey: i18n.translate('xpack.lens.dragDrop.control', {
          defaultMessage: 'Control',
        }),
      };
    default:
      throw Error('Drop type not supported');
  }
}

const getExtraDrop = ({
  type,
  isIncompatible,
}: {
  type: 'swap' | 'duplicate' | 'combine';
  isIncompatible?: boolean;
}) => {
  const { icon, label, controlKey } = getPropsForDropType(type);
  return (
    <EuiFlexGroup
      gutterSize="s"
      justifyContent="spaceBetween"
      alignItems="center"
      className={classNames('lnsDragDrop__extraDrop', {
        'lnsDragDrop-incompatibleExtraDrop': isIncompatible,
      })}
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon size="m" type={icon} />
          </EuiFlexItem>
          <EuiFlexItem grow={false} data-test-subj={`lnsDragDrop-${type}`}>
            <EuiText size="s">{label}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs">
          <code> {controlKey}</code>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const customDropTargetsMap: Partial<{ [dropType in DropType]: React.ReactElement }> = {
  replace_duplicate_incompatible: getExtraDrop({ type: 'duplicate', isIncompatible: true }),
  duplicate_incompatible: getExtraDrop({ type: 'duplicate', isIncompatible: true }),
  swap_incompatible: getExtraDrop({ type: 'swap', isIncompatible: true }),
  replace_duplicate_compatible: getExtraDrop({ type: 'duplicate' }),
  duplicate_compatible: getExtraDrop({ type: 'duplicate' }),
  swap_compatible: getExtraDrop({ type: 'swap' }),
  field_combine: getExtraDrop({ type: 'combine' }),
  combine_compatible: getExtraDrop({ type: 'combine' }),
  combine_incompatible: getExtraDrop({ type: 'combine', isIncompatible: true }),
};

export const getCustomDropTarget = (dropType: DropType) => customDropTargetsMap?.[dropType] || null;

export const getAdditionalClassesOnEnter = (dropType?: string) => {
  if (
    dropType &&
    [
      'field_replace',
      'replace_compatible',
      'replace_incompatible',
      'replace_duplicate_compatible',
      'replace_duplicate_incompatible',
    ].includes(dropType)
  ) {
    return 'lnsDragDrop-isReplacing';
  }
};

export const getAdditionalClassesOnDroppable = (dropType?: string) => {
  if (
    dropType &&
    [
      'move_incompatible',
      'replace_incompatible',
      'swap_incompatible',
      'duplicate_incompatible',
      'replace_duplicate_incompatible',
      'combine_incompatible',
    ].includes(dropType)
  ) {
    return 'lnsDragDrop-notCompatible';
  }
};

const isOperationFromCompatibleGroup = (op1?: DraggingIdentifier, op2?: DragDropOperation) => {
  return (
    isOperation(op1) &&
    isOperation(op2) &&
    op1.columnId !== op2.columnId &&
    op1.groupId === op2.groupId &&
    op1.layerId !== op2.layerId
  );
};

export const isOperationFromTheSameGroup = (op1?: DraggingIdentifier, op2?: DragDropOperation) => {
  return (
    isOperation(op1) &&
    isOperation(op2) &&
    op1.columnId !== op2.columnId &&
    op1.groupId === op2.groupId &&
    op1.layerId === op2.layerId
  );
};

export function getDropPropsForSameGroup(
  isNewColumn?: boolean
): { dropTypes: DropType[]; nextLabel?: string } | undefined {
  return !isNewColumn ? { dropTypes: ['reorder'] } : { dropTypes: ['duplicate_compatible'] };
}

export const getDropProps = (
  dropProps: GetDropPropsArgs,
  sharedDatasource?: Datasource<unknown, unknown>
): { dropTypes: DropType[]; nextLabel?: string } | undefined => {
  if (sharedDatasource) {
    return sharedDatasource?.getDropProps(dropProps);
  } else {
    if (isOperationFromTheSameGroup(dropProps.source, dropProps.target)) {
      return getDropPropsForSameGroup(dropProps.target.isNewColumn);
    }
    if (isOperationFromCompatibleGroup(dropProps.source, dropProps.target)) {
      return {
        dropTypes: dropProps.target.isNewColumn
          ? ['move_compatible', 'duplicate_compatible']
          : ['replace_compatible', 'replace_duplicate_compatible', 'swap_compatible'],
      };
    }
  }
  return;
};

export interface OnVisDropProps<T> {
  prevState: T;
  target: DragDropOperation;
  source: DragDropIdentifier;
  frame: FramePublicAPI;
  dropType: DropType;
  group?: VisualizationDimensionGroupConfig;
}

export function onDropForVisualization<T>(
  props: OnVisDropProps<T>,
  activeVisualization: Visualization<T>
) {
  const { prevState, target, frame, dropType, source, group } = props;
  const { layerId, columnId, groupId } = target;

  const previousColumn =
    isOperation(source) && group?.requiresPreviousColumnOnDuplicate ? source.columnId : undefined;

  const newVisState = activeVisualization.setDimension({
    columnId,
    groupId,
    layerId,
    prevState,
    previousColumn,
    frame,
  });

  // remove source
  if (
    isOperation(source) &&
    (dropType === 'move_compatible' ||
      dropType === 'move_incompatible' ||
      dropType === 'combine_incompatible' ||
      dropType === 'combine_compatible' ||
      dropType === 'replace_compatible' ||
      dropType === 'replace_incompatible')
  ) {
    return activeVisualization.removeDimension({
      columnId: source?.columnId,
      layerId: source?.layerId,
      prevState: newVisState,
      frame,
    });
  }
  return newVisState;
}
