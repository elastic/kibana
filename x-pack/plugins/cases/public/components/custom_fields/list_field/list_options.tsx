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
  const inputRef = useRef<HTMLInputElement>(null);
  const [isEditingEnabled, setIsEditingEnabled] = useState(false);

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
    const newOption = { id: `${listValues.length + 1}`, content: '' };

    setIsEditingEnabled(true);

    onChange([...listValues, newOption]);
  }, [onChange, listValues, setIsEditingEnabled]);

  const handleOptionSave = useCallback(
    (id: string, value: string) => {
      const updatedValues = listValues.map((item) =>
        item.id === id ? { id, content: value } : item
      );

      setIsEditingEnabled(false);

      onChange(updatedValues);
    },
    [onChange, setIsEditingEnabled, listValues]
  );

  const onDeleteOption = useCallback(
    (id: string) => {
      setIsEditingEnabled(false);

      onChange(listValues.filter((item) => item.id !== id));
    },
    [onChange, setIsEditingEnabled, listValues]
  );

  useEffect(() => {
    if (isEditingEnabled && inputRef.current) {
      inputRef.current.focus();
      setIsEditingEnabled(false);
    }
  }, [isEditingEnabled, inputRef]);

  const renderInlineOption = (id: string, content?: string) => (
    <EuiFlexGroup justifyContent="flexEnd" gutterSize="xs">
      <EuiFlexItem grow={true}>
        <EuiInlineEditText
          size="m"
          data-test-subj="custom-field-edit-list-inline"
          inputAriaLabel="custom-field-edit-list-inline"
          defaultValue={content ?? ''}
          css={css`
            text-align: left;
          `}
          placeholder={!content ? i18n.LIST_OPTION_PLACEHOLDER : undefined}
          readModeProps={{
            iconType: undefined,
          }}
          editModeProps={{
            inputProps: {
              inputRef,
            },
            cancelButtonProps: {
              onClick: () => setIsEditingEnabled(false),
              'data-test-subj': 'custom-field-edit-list-cancel-btn',
            },
          }}
          startWithEditOpen
          onSave={(value: string) => handleOptionSave(id, value)}
        />
      </EuiFlexItem>
      {/* <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          color="primary"
          isDisabled={disabled}
          isLoading={isLoading}
          size="s"
          onClick={() => setIsEditingEnabled(true)}
          iconType="pencil"
          data-test-subj="custom-field-remove-list-option"
        />
      </EuiFlexItem> */}
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

  const renderPromptBody = () => (
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
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );

  return (
    <>
      {listValues.length ? <EuiSpacer size="l" /> : null}
      <EuiFlexGroup justifyContent="flexStart">
        <EuiFlexItem grow={true}>
          <EuiEmptyPrompt
            body={renderPromptBody()}
            color="subdued"
            className="eui-fullWidth"
            css={css`
              max-width: 100%;
              .euiEmptyPrompt__main {
                padding: 12px;
              }
              .euiEmptyPrompt__contentInner {
                max-width: none;
              }
            `}
            actions={
              <EuiButtonEmpty
                isDisabled={disabled}
                isLoading={isLoading}
                size="s"
                onClick={onAddOption}
                iconType="plusInCircle"
                data-test-subj="cases-add-custom-field"
              >
                {i18n.LIST_ADD_OPTION}
              </EuiButtonEmpty>
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

ListOptionsComponent.displayName = 'ListOptions';

export const ListOptions = React.memo(ListOptionsComponent);
