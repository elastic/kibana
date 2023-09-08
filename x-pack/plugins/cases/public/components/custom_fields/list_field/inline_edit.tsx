/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiInlineEditText, EuiButtonEmpty } from '@elastic/eui';

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
  listOption: ListOption;
  isEditingEnabled: boolean;
  handleEditingEnabled: (value: boolean) => void;
}

const InlineEditComponent: React.FC<Props> = ({
  disabled,
  isLoading,
  listValues,
  onChange,
  listOption,
  isEditingEnabled,
  handleEditingEnabled,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleOptionSave = useCallback(
    (id: string, value: string) => {
      const updatedValues = listValues.map((item) =>
        item.id === id ? { id, content: value } : item
      );

      handleEditingEnabled(false);

      onChange(updatedValues);
    },
    [onChange, handleEditingEnabled, listValues]
  );

  const onDeleteOption = useCallback(
    (id: string) => {
      handleEditingEnabled(false);

      onChange(listValues.filter((item) => item.id !== id));
    },
    [onChange, handleEditingEnabled, listValues]
  );

  useEffect(() => {
    if (isEditingEnabled && inputRef.current) {
      inputRef.current.focus();
      handleEditingEnabled(false);
    }
  }, [isEditingEnabled, inputRef]);

  return (
    <EuiFlexGroup justifyContent="flexEnd" gutterSize="xs">
      <EuiFlexItem grow={true}>
        <EuiInlineEditText
          size="m"
          data-test-subj="custom-field-edit-list-inline"
          inputAriaLabel="custom-field-edit-list-inline"
          defaultValue={listOption.content ?? ''}
          isLoading={isLoading}
          css={css`
            text-align: left;
          `}
          placeholder={!listOption.content ? i18n.LIST_OPTION_PLACEHOLDER : undefined}
          readModeProps={{
            iconType: undefined,
            onClick: () => handleEditingEnabled(true),
          }}
          editModeProps={{
            inputProps: {
              inputRef,
              disabled,
            },
            cancelButtonProps: {
              onClick: () => handleEditingEnabled(false),
              'data-test-subj': 'custom-field-edit-list-cancel-btn',
            },
          }}
          startWithEditOpen={isEditingEnabled}
          onSave={(value: string) => handleOptionSave(listOption.id, value)}
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
          onClick={() => onDeleteOption(listOption.id)}
          iconType="minusInCircle"
          css={css`
            margin-top: 4px;
          `}
          data-test-subj="custom-field-remove-list-option"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

InlineEditComponent.displayName = 'InlineEdit';

export const InlineEdit = React.memo(InlineEditComponent);
