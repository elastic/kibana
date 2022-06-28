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
  EuiFormRow,
} from '@elastic/eui';

import { MAX_TITLE_LENGTH } from '../../../common/constants';
import * as i18n from './translations';
import { Title } from './title';
import { useCasesContext } from '../cases_context/use_cases_context';

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

export interface EditableTitleProps {
  userCanCrud: boolean;
  isLoading: boolean;
  title: string;
  onSubmit: (title: string) => void;
}

const EditableTitleComponent: React.FC<EditableTitleProps> = ({
  userCanCrud = false,
  onSubmit,
  isLoading,
  title,
}) => {
  const { releasePhase } = useCasesContext();
  const [editMode, setEditMode] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [newTitle, setNewTitle] = useState<string>(title);

  const onCancel = useCallback(() => {
    setEditMode(false);
    setErrors([]);
    setNewTitle(title);
  }, [title]);

  const onClickEditIcon = useCallback(() => setEditMode(true), []);
  const onClickSubmit = useCallback((): void => {
    if (newTitle.length > MAX_TITLE_LENGTH) {
      setErrors([i18n.MAX_LENGTH_ERROR('title', MAX_TITLE_LENGTH)]);
      return;
    }

    if (newTitle !== title) {
      onSubmit(newTitle);
    }
    setEditMode(false);
    setErrors([]);
  }, [newTitle, onSubmit, title]);

  const handleOnChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => setNewTitle(e.target.value),
    []
  );

  const hasErrors = errors.length > 0;

  return editMode ? (
    <EuiFormRow isInvalid={hasErrors} error={errors} fullWidth>
      <EuiFlexGroup
        alignItems="center"
        responsive={true}
        gutterSize="m"
        justifyContent="spaceBetween"
      >
        <EuiFlexItem grow={true}>
          <EuiFieldText
            fullWidth={true}
            onChange={handleOnChange}
            value={`${newTitle}`}
            data-test-subj="editable-title-input-field"
          />
        </EuiFlexItem>
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
    </EuiFormRow>
  ) : (
    <Title title={title} releasePhase={releasePhase}>
      {isLoading && <MySpinner data-test-subj="editable-title-loading" />}
      {!isLoading && userCanCrud && (
        <MyEuiButtonIcon
          aria-label={i18n.EDIT_TITLE_ARIA(title as string)}
          iconType="pencil"
          onClick={onClickEditIcon}
          data-test-subj="editable-title-edit-icon"
        />
      )}
    </Title>
  );
};
EditableTitleComponent.displayName = 'EditableTitle';

export const EditableTitle = React.memo(EditableTitleComponent);
