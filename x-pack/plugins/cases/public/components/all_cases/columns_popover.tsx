/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import type { DropResult } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiDragDropContext,
  EuiButtonEmpty,
  EuiDraggable,
  EuiDroppable,
  EuiPanel,
  euiDragDropReorder,
  EuiIcon,
  EuiSwitch,
} from '@elastic/eui';

import type { CasesColumnSelection } from '../../../common/ui/types';

interface Props {
  selectedColumns: CasesColumnSelection[];
  onSelectedColumnsChange: (columns: CasesColumnSelection[]) => void;
}

export const ColumnsPopover: React.FC<Props> = ({
  selectedColumns,
  onSelectedColumnsChange,
}: Props) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const togglePopover = useCallback(() => setIsPopoverOpen(!isPopoverOpen), [isPopoverOpen]);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const onDragEnd = ({ source, destination }: DropResult) => {
    if (source && destination) {
      const newSelectedColumns = euiDragDropReorder(
        selectedColumns,
        source.index,
        destination.index
      );

      onSelectedColumnsChange(newSelectedColumns);
    }
  };

  const toggleColumn = useCallback(
    ({ field, isChecked }) => {
      const newSelectedColumns = selectedColumns.map((column) => {
        if (column.field === field) {
          return { ...column, isChecked };
        }
        return column;
      });

      onSelectedColumnsChange(newSelectedColumns);
    },
    [selectedColumns, onSelectedColumnsChange]
  );

  return (
    <EuiPopover
      button={
        <EuiButtonEmpty
          aria-label="Columns"
          className="columns"
          data-test-subj="show-field-browser"
          iconType="indexOpen"
          iconSide="left"
          onClick={togglePopover}
          size="xs"
        >
          {'Columns'}
        </EuiButtonEmpty>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      hasDragDrop
    >
      <EuiDragDropContext onDragEnd={onDragEnd}>
        <EuiFlexGroup style={{ width: 300 }}>
          <EuiFlexItem>
            <EuiDroppable droppableId="DROPPABLE_AREA_BARE" style={{ paddingBottom: 15 }}>
              {selectedColumns.map(({ field, name, isChecked }, idx) => (
                <EuiDraggable
                  key={field}
                  index={idx}
                  draggableId={field}
                  customDragHandle={true}
                  hasInteractiveChildren={true}
                  style={{ height: 35, paddingLeft: 16 }}
                >
                  {(provided) => (
                    <EuiFlexGroup alignItems="center" gutterSize="m" justifyContent="spaceBetween">
                      <EuiFlexItem>
                        <EuiSwitch
                          label={name}
                          checked={isChecked}
                          onChange={(e) => toggleColumn({ field, isChecked: e.target.checked })}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiPanel
                          color="transparent"
                          {...provided.dragHandleProps}
                          aria-label="Drag Handle"
                        >
                          <EuiIcon type="grab" />
                        </EuiPanel>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  )}
                </EuiDraggable>
              ))}
            </EuiDroppable>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiDragDropContext>
    </EuiPopover>
  );
};
ColumnsPopover.displayName = 'ColumnsPopover';
