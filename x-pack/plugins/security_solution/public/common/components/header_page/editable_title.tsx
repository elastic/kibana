/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, ChangeEvent } from 'react';
import styled, { css } from 'styled-components';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiButtonIcon,
  EuiLoadingSpinner,
} from '@elastic/eui';

import * as i18n from './translations';

import { Title } from './title';

const MyEuiButtonIcon = styled(EuiButtonIcon)`
  ${({ theme }) => css`
    margin-left: ${theme.eui.euiSize};
  `}
`;

const MySpinner = styled(EuiLoadingSpinner)`
  ${({ theme }) => css`
    margin-left: ${theme.eui.euiSize};
  `}
`;

interface Props {
  disabled?: boolean;
  isLoading: boolean;
  title: string | React.ReactNode;
  onSubmit: (title: string) => void;
}

const EditableTitleComponent: React.FC<Props> = ({
  disabled = false,
  onSubmit,
  isLoading,
  title,
}) => {
  const [editMode, setEditMode] = useState(false);
  const [changedTitle, onTitleChange] = useState<string>(typeof title === 'string' ? title : '');

  const onCancel = useCallback(() => setEditMode(false), []);
  const onClickEditIcon = useCallback(() => setEditMode(true), []);

  const onClickSubmit = useCallback((): void => {
    if (changedTitle !== title) {
      onSubmit(changedTitle);
    }
    setEditMode(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changedTitle, title]);

  const handleOnChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => onTitleChange(e.target.value),
    []
  );
  return editMode ? (
    <EuiFlexGroup alignItems="center" gutterSize="m" justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <EuiFieldText
          onChange={handleOnChange}
          value={`${changedTitle}`}
          data-test-subj="editable-title-input-field"
        />
      </EuiFlexItem>
      <EuiFlexGroup gutterSize="none" responsive={false} wrap={true}>
        <EuiFlexItem grow={false}>
          <EuiButton
            color="success"
            data-test-subj="editable-title-submit-btn"
            fill
            iconType="save"
            onClick={onClickSubmit}
            size="s"
          >
            {i18n.SAVE}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="editable-title-cancel-btn"
            iconType="cross"
            onClick={onCancel}
            size="s"
          >
            {i18n.CANCEL}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexItem />
    </EuiFlexGroup>
  ) : (
    <EuiFlexGroup alignItems="center" gutterSize="none">
      <EuiFlexItem grow={false}>
        <Title title={title} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {isLoading && <MySpinner data-test-subj="editable-title-loading" />}
        {!isLoading && (
          <MyEuiButtonIcon
            isDisabled={disabled}
            aria-label={i18n.EDIT_TITLE_ARIA(title as string)}
            iconType="pencil"
            onClick={onClickEditIcon}
            data-test-subj="editable-title-edit-icon"
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const EditableTitle = React.memo(EditableTitleComponent);
