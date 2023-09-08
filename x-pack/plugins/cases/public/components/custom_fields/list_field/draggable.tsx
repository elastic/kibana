/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiDragDropContext,
  EuiDroppable,
  euiDragDropReorder,
  EuiDraggable,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiInlineEditText,
  EuiSpacer,
  EuiButtonEmpty,
  EuiEmptyPrompt,
} from '@elastic/eui';

import * as i18n from '../translations';
import { InlineEdit } from './inline_edit';

export interface ListOption {
  content: string;
  id: string;
}
export interface Props {
  disabled: boolean;
  isLoading: boolean;
  onChange: (listValues: ListOption[]) => void;
  listValues: ListOption[];
  isEditingEnabled: boolean;
  handleEditingEnabled: (value: boolean) => void;
}

const DraggableComponent: React.FC<Props> = (props) => {
  const { listValues, onChange } = props;

  const handleDragEnd = useCallback(
    ({ source, destination }) => {
      if (source && destination) {
        const items = euiDragDropReorder(listValues, source.index, destination.index);
        onChange(items);
      }
    },
    [onChange, listValues]
  );

  return (
    <>
      <EuiFlexGroup justifyContent="flexStart">
        <EuiFlexItem grow={false}>
          <h5>{i18n.LIST_VALUES_LABEL}</h5>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiFlexGroup justifyContent="flexStart">
        <EuiFlexItem>
          {listValues.length ? (
            <EuiDragDropContext onDragEnd={handleDragEnd}>
              <EuiDroppable droppableId="droppable-area" spacing="m" withPanel>
                {listValues.map(({ content, id }, idx) => (
                  <EuiDraggable
                    spacing="m"
                    key={id}
                    index={idx}
                    draggableId={id}
                    customDragHandle={true}
                    hasInteractiveChildren={true}
                  >
                    {(provided) => (
                      <EuiPanel paddingSize="s">
                        <EuiFlexGroup alignItems="center" gutterSize="s">
                          <EuiFlexItem grow={false}>
                            <EuiPanel
                              color="transparent"
                              paddingSize="s"
                              {...provided.dragHandleProps}
                              aria-label="Drag Handle"
                            >
                              <EuiIcon type="grab" />
                            </EuiPanel>
                          </EuiFlexItem>
                          <EuiFlexItem grow={true}>
                            <InlineEdit {...props} listOption={{id, content}}  />
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiPanel>
                    )}
                  </EuiDraggable>
                ))}
              </EuiDroppable>
            </EuiDragDropContext>
          ) : null}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

DraggableComponent.displayName = 'Draggable';

export const Draggable = React.memo(DraggableComponent);
