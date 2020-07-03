/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiButton,
  EuiSpacer,
  EuiColorPicker,
  EuiTextArea,
} from '@elastic/eui';
import { EuiFlexGroup } from '@elastic/eui';
import { EuiFlexItem } from '@elastic/eui';
import { EuiButtonEmpty } from '@elastic/eui';
import { Link } from 'react-router-dom';
import { txtTitle, txtColor, txtDescription, txtCreate, txtCancel } from './i18n';

export interface Props {
  title: string;
  color?: string;
  description?: string;
  disabled?: boolean;
  onTitleChange: (title: string) => void;
  onColorChange?: (color: string) => void;
  onDescriptionChange?: (description: string) => void;
  onSubmit: () => void;
}

export const CreateNewTagForm: React.FC<Props> = ({
  title,
  color,
  description,
  disabled,
  onTitleChange,
  onColorChange,
  onDescriptionChange,
  onSubmit,
}) => {
  return (
    <EuiForm
      component="form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <EuiFormRow label={txtTitle}>
        <EuiFieldText
          name="first"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          autoFocus
          aria-label={txtTitle}
          disabled={disabled}
        />
      </EuiFormRow>

      {!!onColorChange && (
        <EuiFormRow label={txtColor}>
          <EuiColorPicker
            color={color}
            onChange={(newColor) => onColorChange(newColor)}
            aria-label={txtColor}
            disabled={disabled}
          />
        </EuiFormRow>
      )}

      {!!onDescriptionChange && (
        <EuiFormRow label={txtDescription}>
          <EuiTextArea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            aria-label={txtDescription}
            disabled={disabled}
          />
        </EuiFormRow>
      )}

      <EuiSpacer />

      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            color="secondary"
            iconType="check"
            type="submit"
            data-test-subj="submitButton"
            disabled={disabled}
            isLoading={disabled}
          >
            {txtCreate}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <Link to={'/'}>
            <EuiButtonEmpty color="primary">{txtCancel}</EuiButtonEmpty>
          </Link>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiForm>
  );
};
