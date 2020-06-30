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
import { txtTitle, txtColor, txtDescription, txtSave } from './i18n';

export interface Props {
  title: string;
  color?: string;
  description?: string;
  onTitleChange: (title: string) => void;
  onColorChange?: (color: string) => void;
  onDescriptionChange?: (description: string) => void;
  onSubmit: () => void;
}

export const CreateNewTagForm: React.FC<Props> = ({
  title,
  color,
  description,
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
          aria-label={txtTitle}
        />
      </EuiFormRow>

      {!!onColorChange && (
        <EuiFormRow label={txtColor}>
          <EuiColorPicker
            color={color}
            onChange={(newColor) => onColorChange(newColor)}
            aria-label={txtColor}
          />
        </EuiFormRow>
      )}

      {!!onDescriptionChange && (
        <EuiFormRow label={txtDescription}>
          <EuiTextArea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            aria-label={txtDescription}
          />
        </EuiFormRow>
      )}

      <EuiSpacer />

      <EuiButton type="submit" fill>
        {txtSave}
      </EuiButton>
    </EuiForm>
  );
};
