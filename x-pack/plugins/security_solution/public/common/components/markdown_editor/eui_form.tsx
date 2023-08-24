/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { forwardRef, useState } from 'react';
import styled from 'styled-components';
import type { EuiMarkdownEditorProps } from '@elastic/eui';
import { EuiFormRow, EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import type { FieldHook } from '../../../shared_imports';
import { getFieldValidityAndErrorMessage } from '../../../shared_imports';

import type { MarkdownEditorRef } from './editor';
import { MarkdownEditor } from './editor';

/* eslint-disable react/no-unused-prop-types */
type MarkdownEditorFormProps = EuiMarkdownEditorProps & {
  id: string;
  field: FieldHook;
  dataTestSubj: string;
  idAria: string;
  isDisabled?: boolean;
  bottomRightContent?: React.ReactNode;
};
/* eslint-enable react/no-unused-prop-types */

const BottomContentWrapper = styled(EuiFlexGroup)`
  ${({ theme }) => `
    padding: ${theme.eui.euiSizeM} 0;
  `}
`;

export const MarkdownEditorForm = React.memo(
  forwardRef<MarkdownEditorRef, MarkdownEditorFormProps>(
    ({ id, field, dataTestSubj, idAria, bottomRightContent }, ref) => {
      const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
      const [isMarkdownInvalid, setIsMarkdownInvalid] = useState(false);

      return (
        <EuiFormRow
          data-test-subj={dataTestSubj}
          describedByIds={idAria ? [idAria] : undefined}
          error={errorMessage}
          fullWidth
          helpText={field.helpText}
          isInvalid={isInvalid || isMarkdownInvalid}
          label={field.label}
          labelAppend={field.labelAppend}
        >
          <>
            <MarkdownEditor
              ref={ref}
              ariaLabel={idAria}
              editorId={id}
              onChange={field.setValue}
              value={field.value as string}
              data-test-subj={`${dataTestSubj}-markdown-editor`}
              setIsMarkdownInvalid={setIsMarkdownInvalid}
            />
            {bottomRightContent && (
              <BottomContentWrapper justifyContent={'flexEnd'}>
                <EuiFlexItem grow={false}>{bottomRightContent}</EuiFlexItem>
              </BottomContentWrapper>
            )}
          </>
        </EuiFormRow>
      );
    }
  )
);

MarkdownEditorForm.displayName = 'MarkdownEditorForm';
