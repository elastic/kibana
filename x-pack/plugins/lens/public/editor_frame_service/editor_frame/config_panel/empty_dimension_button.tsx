/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { generateId } from '../../../id_generator';
import { DragDrop, DragDropIdentifier } from '../../../drag_drop';
import { Datasource, VisualizationDimensionGroupConfig } from '../../../types';
import { LayerDatasourceDropProps } from './types';

const label = i18n.translate('xpack.lens.indexPattern.emptyDimensionButton', {
  defaultMessage: 'Empty dimension',
});

export function EmptyDimensionButton({
  group,
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
  onClick: (id: string) => void;
  onDrop: (droppedItem: DragDropIdentifier, dropTarget: DragDropIdentifier) => void;
  group: VisualizationDimensionGroupConfig;
  layerDatasource: Datasource<unknown, unknown>;
  layerDatasourceDropProps: LayerDatasourceDropProps;
}) {
  const itemIndex = group.accessors.length;

  const [newColumnId, setNewColumnId] = useState<string>(generateId());
  useEffect(() => {
    setNewColumnId(generateId());
  }, [itemIndex]);

  const dropType = layerDatasource.getDropTypes({
    ...layerDatasourceDropProps,
    columnId: newColumnId,
    filterOperations: group.filterOperations,
    groupId: group.groupId,
  });

  const value = useMemo(() => {
    return {
      columnId: newColumnId,
      groupId: group.groupId,
      layerId,
      isNew: true,
      id: newColumnId,
      dropType,
      humanData: {
        label,
        groupLabel: group.groupLabel,
        position: itemIndex + 1,
      },
    };
  }, [dropType, newColumnId, group.groupId, layerId, group.groupLabel, itemIndex]);

  const getAdditionalClassesOnDroppable = React.useCallback((currentDropType?: string) => {
    if (currentDropType === 'convert_add' || currentDropType === 'remove_convert_move') {
      return 'lnsDragDrop-notCompatible';
    }
  }, []);

  const handleDrop = (droppedItem: DragDropIdentifier) => onDrop(droppedItem, value, dropType);

  return (
    <div className="lnsLayerPanel__dimensionContainer" data-test-subj={group.dataTestSubj}>
      <DragDrop
        getAdditionalClassesOnDroppable={getAdditionalClassesOnDroppable}
        value={value}
        /* 2 to leave room for data panel and workspace, then go by layer index, then by group index */
        order={[2, layerIndex, groupIndex, itemIndex]}
        onDrop={handleDrop}
        label={label}
        dropType={dropType}
        droppable={!!dropType}
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
