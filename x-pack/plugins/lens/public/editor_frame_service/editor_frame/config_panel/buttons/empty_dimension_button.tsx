/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useEffect, useContext } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { generateId } from '../../../../id_generator';
import { DragDrop, DragDropIdentifier, DragContext } from '../../../../drag_drop';

import { Datasource, VisualizationDimensionGroupConfig, DropType } from '../../../../types';
import { LayerDatasourceDropProps } from '../types';
import { getCustomDropTarget, getAdditionalClassesOnDroppable } from './drop_targets_utils';

const label = i18n.translate('xpack.lens.indexPattern.emptyDimensionButton', {
  defaultMessage: 'Empty dimension',
});

interface EmptyButtonProps {
  columnId: string;
  onClick: (id: string) => void;
  group: VisualizationDimensionGroupConfig;
}

const DefaultEmptyButton = ({ columnId, group, onClick }: EmptyButtonProps) => (
  <EuiButtonEmpty
    className="lnsLayerPanel__triggerText"
    color="text"
    size="s"
    iconType="plusInCircleFilled"
    contentProps={{
      className: 'lnsLayerPanel__triggerTextContent',
    }}
    aria-label={i18n.translate('xpack.lens.indexPattern.removeColumnAriaLabel', {
      defaultMessage: 'Add or drag-and-drop a field to {groupLabel}',
      values: { groupLabel: group.groupLabel },
    })}
    data-test-subj="lns-empty-dimension"
    onClick={() => {
      onClick(columnId);
    }}
  >
    <FormattedMessage
      id="xpack.lens.configure.emptyConfig"
      defaultMessage="Add or drag-and-drop a field"
    />
  </EuiButtonEmpty>
);

const SuggestedValueButton = ({ columnId, group, onClick }: EmptyButtonProps) => (
  <EuiButtonEmpty
    className="lnsLayerPanel__triggerText"
    color="text"
    size="s"
    iconType="plusInCircleFilled"
    contentProps={{
      className: 'lnsLayerPanel__triggerTextContent',
    }}
    aria-label={i18n.translate('xpack.lens.indexPattern.removeColumnAriaLabel', {
      defaultMessage: 'Add or drag-and-drop a field to {groupLabel}',
      values: { groupLabel: group.groupLabel },
    })}
    data-test-subj="lns-empty-dimension-suggested-value"
    onClick={() => {
      onClick(columnId);
    }}
  >
    <FormattedMessage
      id="xpack.lens.configure.suggestedValuee"
      defaultMessage="Suggested value: {value}"
      values={{ value: group.suggestedValue?.() }}
    />
  </EuiButtonEmpty>
);

export function EmptyDimensionButton({
  group,
  groups,
  layerDatasource,
  layerDatasourceDropProps,
  layerId,
  groupIndex,
  layerIndex,
  onClick,
  onDrop,
}: {
  layerId: string;
  groupIndex: number;
  layerIndex: number;
  onDrop: (
    droppedItem: DragDropIdentifier,
    dropTarget: DragDropIdentifier,
    dropType?: DropType
  ) => void;
  onClick: (id: string) => void;
  group: VisualizationDimensionGroupConfig;
  groups: VisualizationDimensionGroupConfig[];

  layerDatasource: Datasource<unknown, unknown>;
  layerDatasourceDropProps: LayerDatasourceDropProps;
}) {
  const { dragging } = useContext(DragContext);

  const itemIndex = group.accessors.length;

  const [newColumnId, setNewColumnId] = useState<string>(generateId());
  useEffect(() => {
    setNewColumnId(generateId());
  }, [itemIndex]);

  const dropProps = layerDatasource.getDropProps({
    ...layerDatasourceDropProps,
    dragging,
    columnId: newColumnId,
    filterOperations: group.filterOperations,
    groupId: group.groupId,
    dimensionGroups: groups,
  });

  const dropTypes = dropProps?.dropTypes;
  const nextLabel = dropProps?.nextLabel;

  const canDuplicate = !!(
    dropTypes &&
    (dropTypes.includes('duplicate_compatible') || dropTypes.includes('duplicate_incompatible'))
  );

  const value = useMemo(
    () => ({
      columnId: newColumnId,
      groupId: group.groupId,
      layerId,
      id: newColumnId,
      humanData: {
        label,
        groupLabel: group.groupLabel,
        position: itemIndex + 1,
        nextLabel: nextLabel || '',
        canDuplicate,
      },
    }),
    [newColumnId, group.groupId, layerId, group.groupLabel, itemIndex, nextLabel, canDuplicate]
  );

  const handleOnDrop = React.useCallback(
    (droppedItem, selectedDropType) => onDrop(droppedItem, value, selectedDropType),
    [value, onDrop]
  );

  return (
    <div className="lnsLayerPanel__dimensionContainer" data-test-subj={group.dataTestSubj}>
      <DragDrop
        getAdditionalClassesOnDroppable={getAdditionalClassesOnDroppable}
        value={value}
        order={[2, layerIndex, groupIndex, itemIndex]}
        onDrop={handleOnDrop}
        dropTypes={dropTypes}
        getCustomDropTarget={getCustomDropTarget}
      >
        <div className="lnsLayerPanel__dimension lnsLayerPanel__dimension--empty">
          {typeof group.suggestedValue?.() === 'number' ? (
            <SuggestedValueButton columnId={value.columnId} onClick={onClick} group={group} />
          ) : (
            <DefaultEmptyButton columnId={value.columnId} onClick={onClick} group={group} />
          )}
        </div>
      </DragDrop>
    </div>
  );
}
