/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
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
import { EuiHorizontalRule } from '@elastic/eui';
import { EuiDescribedFormGroup } from '@elastic/eui';
import { EuiCode } from '@elastic/eui';
import { txtTitle, txtColor, txtDescription, txtCreate, txtCancel } from './i18n';
import { Tag } from '../../../components/tag';
import { parseTag } from '../../../../common';

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
  const { key, value } = useMemo(() => parseTag(title), [title]);

  return (
    <EuiForm
      component="form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <EuiDescribedFormGroup
        title={<h3>Display</h3>}
        description={
          <>
            <div>This is how your tag will look like.</div>
            <EuiSpacer size={'s'} />
            {!!key && <Tag tag={{ title, key, value, color: color || 'transparent' }} />}
          </>
        }
      >
        <EuiFormRow
          label={txtTitle}
          helpText={
            <>
              Use colon <EuiCode paddingSize={'s'}>:</EuiCode> to create a key-value tag. Max. 256
              characters.
            </>
          }
        >
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
      </EuiDescribedFormGroup>

      {!!onDescriptionChange && (
        <EuiDescribedFormGroup
          title={<h3>Extra</h3>}
          description={<>Add extra description to your tag.</>}
        >
          <EuiFormRow label={txtDescription}>
            <EuiTextArea
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              aria-label={txtDescription}
              disabled={disabled}
            />
          </EuiFormRow>
        </EuiDescribedFormGroup>
      )}

      <EuiHorizontalRule />

      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            color="secondary"
            iconType="check"
            type="submit"
            data-test-subj="submitButton"
            disabled={disabled || !title}
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
