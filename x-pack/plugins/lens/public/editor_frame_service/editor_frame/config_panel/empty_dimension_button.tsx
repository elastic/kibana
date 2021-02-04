/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { generateId } from '../../../id_generator';
import { DragDrop, DragDropIdentifier, DragContextState } from '../../../drag_drop';
import { Datasource, VisualizationDimensionGroupConfig, isDraggedOperation } from '../../../types';
import { LayerDatasourceDropProps } from './types';

export function EmptyDimensionButton({
  dragDropContext,
  group,
  layerDatasource,
  layerDatasourceDropProps,
  layerId,
  groupIndex,
  layerIndex,
  onClick,
  onDrop,
}: {
  dragDropContext: DragContextState;
  layerId: string;
  groupIndex: number;
  layerIndex: number;
  onClick: (id: string) => void;
  onDrop: (droppedItem: DragDropIdentifier, dropTarget: DragDropIdentifier) => void;
  group: VisualizationDimensionGroupConfig;

  layerDatasource: Datasource<unknown, unknown>;
  layerDatasourceDropProps: LayerDatasourceDropProps;
}) {
  const handleDrop = (droppedItem: DragDropIdentifier) => onDrop(droppedItem, value);

  const value = useMemo(() => {
    const newId = generateId();
    return {
      columnId: newId,
      groupId: group.groupId,
      layerId,
      isNew: true,
      id: newId,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group.accessors.length, group.groupId, layerId]);

  return (
    <div className="lnsLayerPanel__dimensionContainer" data-test-subj={group.dataTestSubj}>
      <DragDrop
        value={value}
        onDrop={handleDrop}
        droppable={
          Boolean(dragDropContext.dragging) &&
          // Verify that the dragged item is not coming from the same group
          // since this would be a duplicate
          (!isDraggedOperation(dragDropContext.dragging) ||
            dragDropContext.dragging.groupId !== group.groupId) &&
          layerDatasource.canHandleDrop({
            ...layerDatasourceDropProps,
            columnId: value.columnId,
            filterOperations: group.filterOperations,
          })
        }
      >
        <div className="lnsLayerPanel__dimension lnsLayerPanel__dimension--empty">
          <EuiButtonEmpty
            className="lnsLayerPanel__triggerText"
            color="text"
            size="xs"
            iconType="plusInCircleFilled"
            contentProps={{
              className: 'lnsLayerPanel__triggerTextContent',
            }}
            aria-label={i18n.translate('xpack.lens.indexPattern.removeColumnAriaLabel', {
              defaultMessage: 'Drop a field or click to add to {groupLabel}',
              values: { groupLabel: group.groupLabel },
            })}
            data-test-subj="lns-empty-dimension"
            onClick={() => {
              onClick(value.columnId);
            }}
          >
            <FormattedMessage
              id="xpack.lens.configure.emptyConfig"
              defaultMessage="Drop a field or click to add"
            />
          </EuiButtonEmpty>
        </div>
      </DragDrop>
    </div>
  );
}
