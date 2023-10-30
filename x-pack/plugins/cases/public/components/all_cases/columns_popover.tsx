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
  useEuiTheme,
} from '@elastic/eui';

import type { CasesColumnSelection } from './types';

import * as i18n from './translations';

interface Props {
  selectedColumns: CasesColumnSelection[];
  onSelectedColumnsChange: (columns: CasesColumnSelection[]) => void;
}

export const ColumnsPopover: React.FC<Props> = ({
  selectedColumns,
  onSelectedColumnsChange,
}: Props) => {
  const { euiTheme } = useEuiTheme();

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const togglePopover = useCallback(() => setIsPopoverOpen((prevValue) => !prevValue), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const onDragEnd = ({ source, destination }: DropResult) => {
    if (source && destination) {
      const reorderedColumns = euiDragDropReorder(selectedColumns, source.index, destination.index);

      onSelectedColumnsChange(reorderedColumns);
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
          data-test-subj="column-selection-popover"
          iconType="indexOpen"
          iconSide="left"
          onClick={togglePopover}
          size="xs"
        >
          {i18n.COLUMNS}
        </EuiButtonEmpty>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="leftUp"
      hasDragDrop
      zIndex={0}
    >
      <EuiDragDropContext onDragEnd={onDragEnd}>
        <EuiFlexGroup css={{ width: 300 }}>
          <EuiFlexItem>
            <EuiDroppable
              droppableId="DROPPABLE_AREA_BARE"
              css={{ paddingBottom: euiTheme.size.base }}
            >
              {selectedColumns.map(({ field, name, isChecked }, idx) => (
                <EuiDraggable
                  key={field}
                  index={idx}
                  draggableId={field}
                  customDragHandle={true}
                  hasInteractiveChildren={true}
                  css={{ height: euiTheme.size.xl, paddingLeft: euiTheme.size.base }}
                >
                  {(provided) => (
                    <EuiFlexGroup alignItems="center" gutterSize="m" justifyContent="spaceBetween">
                      <EuiFlexItem>
                        <EuiSwitch
                          label={name}
                          checked={isChecked}
                          data-test-subj={`column-selection-switch-${field}`}
                          onChange={(e) => toggleColumn({ field, isChecked: e.target.checked })}
                          compressed
                          labelProps={{
                            style: {
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              width: '190px',
                              overflow: 'hidden',
                            },
                            title: name,
                          }}
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
