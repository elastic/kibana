/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import { css } from '@emotion/react';

import { EuiFlexGroup, EuiFlexItem, EuiInlineEditTitle } from '@elastic/eui';

import { MAX_TITLE_LENGTH } from '../../../common/constants';
import * as i18n from './translations';
import { TitleExperimentalBadge, TitleBetaBadge } from './title';
import { useCasesContext } from '../cases_context/use_cases_context';

export interface EditableTitleProps {
  isLoading: boolean;
  title: string;
  onSubmit: (title: string) => void;
}

const EditableTitleComponent: React.FC<EditableTitleProps> = ({ onSubmit, isLoading, title }) => {
  const { releasePhase, permissions } = useCasesContext();
  const [editMode, setEditMode] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const onClickSubmit = useCallback(
    (newTitleValue: string): boolean => {
      if (!newTitleValue.trim().length) {
        setErrors([i18n.TITLE_REQUIRED]);
        return false;
      }

      if (newTitleValue.trim().length > MAX_TITLE_LENGTH) {
        setErrors([i18n.MAX_LENGTH_ERROR('title', MAX_TITLE_LENGTH)]);
        return false;
      }

      if (newTitleValue !== title) {
        onSubmit(newTitleValue.trim());
      }
      setEditMode(false);
      setErrors([]);

      return true;
    },
    [onSubmit, title]
  );

  const onCancel = () => {
    setErrors([]);
    setEditMode(false);
  };

  const hasErrors = errors.length > 0;

  return (
    <EuiFlexGroup>
      <EuiFlexItem
        grow={true}
        css={
          releasePhase &&
          css`
            overflow: hidden;
          `
        }
      >
        <EuiInlineEditTitle
          defaultValue={title}
          readModeProps={{
            onClick: () => setEditMode(true),
            'data-test-subj': 'editable-title-header-value',
          }}
          editModeProps={{
            formRowProps: { error: errors },
            inputProps: {
              'data-test-subj': 'editable-title-input-field',
              onChange: () => {
                setErrors([]);
              },
            },
            saveButtonProps: {
              'data-test-subj': 'editable-title-submit-btn',
              isDisabled: hasErrors,
            },
            cancelButtonProps: {
              onClick: () => onCancel(),
              'data-test-subj': 'editable-title-cancel-btn',
            },
          }}
          inputAriaLabel="Editable title input field"
          heading="h1"
          size="l"
          isInvalid={hasErrors}
          isLoading={isLoading}
          isReadOnly={!permissions.update}
          onSave={(value) => {
            return onClickSubmit(value);
          }}
          startWithEditOpen={editMode}
          data-test-subj="header-page-title"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {releasePhase === 'experimental' && <TitleExperimentalBadge />}
        {releasePhase === 'beta' && <TitleBetaBadge />}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
EditableTitleComponent.displayName = 'EditableTitle';

export const EditableTitle = React.memo(EditableTitleComponent);
