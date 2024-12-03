/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeEvent } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';

import type { DropResult } from '@elastic/eui';

import {
  EuiFieldSearch,
  EuiHighlight,
  EuiPopoverFooter,
  EuiPopoverTitle,
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

interface ToggleColumnsParams {
  isChecked: boolean;
  field?: string;
}

export const ColumnsPopover: React.FC<Props> = ({
  selectedColumns,
  onSelectedColumnsChange,
}: Props) => {
  const { euiTheme } = useEuiTheme();

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const togglePopover = useCallback(() => setIsPopoverOpen((prevValue) => !prevValue), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const [columnSearchText, setColumnSearchText] = useState('');

  const isDragEnabled = columnSearchText.length === 0;

  const toggleColumns = useCallback(
    ({ isChecked, field }: ToggleColumnsParams) => {
      const newSelectedColumns = selectedColumns.map((column) => {
        if (column.field === field || !field) {
          return { ...column, isChecked };
        }
        return column;
      });

      onSelectedColumnsChange(newSelectedColumns);
    },
    [selectedColumns, onSelectedColumnsChange]
  );

  const showAll = useCallback(() => toggleColumns({ isChecked: true }), [toggleColumns]);
  const hideAll = useCallback(() => toggleColumns({ isChecked: false }), [toggleColumns]);

  const onDragEnd = ({ source, destination }: DropResult) => {
    if (source && destination) {
      const reorderedColumns = euiDragDropReorder(selectedColumns, source.index, destination.index);

      onSelectedColumnsChange(reorderedColumns);
    }
  };

  const filteredColumns = useMemo(
    () =>
      selectedColumns.filter(
        ({ name }) => name.toLowerCase().indexOf(columnSearchText.toLowerCase()) !== -1
      ),
    [selectedColumns, columnSearchText]
  );

  return (
    <EuiPopover
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="s"
      anchorPosition="leftUp"
      zIndex={0}
      data-test-subj="column-selection-popover"
      button={
        <EuiButtonEmpty
          aria-label={i18n.COLUMNS}
          className="columns"
          data-test-subj="column-selection-popover-button"
          iconType="indexOpen"
          iconSide="left"
          onClick={togglePopover}
          size="xs"
        >
          {i18n.COLUMNS}
        </EuiButtonEmpty>
      }
    >
      <EuiPopoverTitle>
        <EuiFieldSearch
          compressed
          placeholder={i18n.SEARCH}
          aria-label={i18n.SEARCH_COLUMNS}
          value={columnSearchText}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setColumnSearchText(e.currentTarget.value)
          }
          data-test-subj="column-selection-popover-search"
        />
      </EuiPopoverTitle>
      <EuiDragDropContext onDragEnd={onDragEnd}>
        <EuiFlexGroup
          css={css`
            width: 300px;
            height: 40vh;
          `}
          className="eui-yScrollWithShadows"
          data-test-subj="column-selection-popover-drag-drop-context"
        >
          <EuiFlexItem>
            <EuiDroppable
              droppableId="casesColumnDroppableArea"
              css={
                isDragEnabled
                  ? {
                      paddingBottom: euiTheme.size.base,
                    }
                  : {
                      paddingTop: euiTheme.size.base,
                    }
              }
            >
              {filteredColumns.map(({ field, name, isChecked }, idx) => (
                <EuiDraggable
                  key={field}
                  index={idx}
                  draggableId={field}
                  isDragDisabled={!isDragEnabled}
                  css={{ height: euiTheme.size.xl, paddingLeft: euiTheme.size.base }}
                  customDragHandle
                  hasInteractiveChildren
                  usePortal
                >
                  {(provided) => (
                    <EuiFlexGroup alignItems="center" gutterSize="m" justifyContent="spaceBetween">
                      <EuiFlexItem grow={false}>
                        <EuiSwitch
                          label={
                            <EuiHighlight search={columnSearchText} title={name}>
                              {name}
                            </EuiHighlight>
                          }
                          checked={isChecked}
                          data-test-subj={`column-selection-switch-${field}`}
                          onChange={(e) => toggleColumns({ field, isChecked: e.target.checked })}
                          compressed
                          labelProps={{
                            style: {
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              width: '190px',
                              overflow: 'hidden',
                            },
                          }}
                        />
                      </EuiFlexItem>
                      {isDragEnabled && (
                        <EuiFlexItem
                          grow={false}
                          data-test-subj="column-selection-popover-draggable-icon"
                        >
                          <EuiPanel
                            color="transparent"
                            {...provided.dragHandleProps}
                            aria-label={i18n.DRAG_HANDLE}
                            grow={false}
                          >
                            <EuiIcon type="grab" color="subdued" />
                          </EuiPanel>
                        </EuiFlexItem>
                      )}
                    </EuiFlexGroup>
                  )}
                </EuiDraggable>
              ))}
            </EuiDroppable>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiDragDropContext>
      <EuiPopoverFooter>
        <EuiFlexGroup gutterSize="s" responsive={false} justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              flush="left"
              onClick={showAll}
              data-test-subj="column-selection-popover-show-all-button"
              disabled={!isDragEnabled}
            >
              {i18n.SHOW_ALL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              flush="right"
              onClick={hideAll}
              data-test-subj="column-selection-popover-hide-all-button"
              disabled={!isDragEnabled}
            >
              {i18n.HIDE_ALL}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverFooter>
    </EuiPopover>
  );
};
ColumnsPopover.displayName = 'ColumnsPopover';
