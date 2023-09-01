/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
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
} from '@elastic/eui';
import { AddListOption } from './add_list_option';
import * as i18n from '../translations';

export interface ListOption {
  content: string;
  id: string;
}
export interface Props {
  disabled: boolean;
  isLoading: boolean;
  onChange: (listValues: ListOption[]) => void;
  listValues: ListOption[];
}

const ListOptionsComponent: React.FC<Props> = ({ disabled, isLoading, listValues, onChange }) => {
  const [addOption, setAddOption] = useState<boolean>(false);

  const onDragEnd = useCallback(
    ({ source, destination }) => {
      if (source && destination) {
        const items = euiDragDropReorder(listValues, source.index, destination.index);
        onChange(items);
      }
    },
    [onChange, listValues]
  );

  const onAddOption = useCallback(() => {
    setAddOption(true);
  }, [setAddOption, listValues]);

  const handleOptionSave = useCallback(
    (id: string | undefined, value: string) => {
      if (id) {
        const updatedValues = listValues.map((item) =>
          item.id === id ? { id, content: value } : item
        );

        onChange(updatedValues);
      } else {
        const newOption = { id: `${value}-${listValues.length + 1}`, content: value };

        onChange([...listValues, newOption]);
      }
      setAddOption(false);
    },
    [setAddOption, onChange, listValues]
  );

  const onDeleteOption = useCallback(
    (id?: string) => {
      if (!id) {
        return;
      }

      onChange(listValues.filter((item) => item.id !== id));
    },
    [onChange]
  );

  const renderInlineEdit = (id?: string, content?: string) => (
    <EuiInlineEditText
      size="m"
      data-test-subj="custom-field-edit-list-inline"
      inputAriaLabel="custom-field-edit-list-inline"
      defaultValue={content ?? ''}
      placeholder={!content ? i18n.LIST_OPTION_PLACEHOLDER : undefined}
      onSave={(value: string) => handleOptionSave(id, value)}
    />
  );

  const renderInlineOption = (id?: string, content?: string) => (
    <EuiFlexGroup justifyContent="flexEnd">
      <EuiFlexItem grow={true}>{renderInlineEdit(id, content)}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          color="danger"
          isDisabled={disabled}
          isLoading={isLoading}
          size="s"
          onClick={() => onDeleteOption(id)}
          iconType="minusInCircle"
          data-test-subj="custom-field-remove-list-option"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <>
      {listValues.length ? (
        <EuiDragDropContext onDragEnd={onDragEnd}>
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
                      <EuiFlexItem grow={true}>{renderInlineOption(id, content)}</EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiPanel>
                )}
              </EuiDraggable>
            ))}
          </EuiDroppable>
        </EuiDragDropContext>
      ) : null}
      {listValues.length ? <EuiSpacer size="l" /> : null}
      {addOption ? renderInlineEdit() : null}
      <AddListOption disabled={disabled} isLoading={isLoading} handleAddOption={onAddOption} />
    </>
  );
};

ListOptionsComponent.displayName = 'ListOptions';

export const ListOptions = React.memo(ListOptionsComponent);
