/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiMarkdownEditorProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import React, { forwardRef } from 'react';
import styled from 'styled-components';
import { getFieldValidityAndErrorMessage } from '../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/helpers';
import type { FieldHook } from '../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/types';
import type { MarkdownEditorRef } from './editor';
import { MarkdownEditor } from './editor';

type MarkdownEditorFormProps = EuiMarkdownEditorProps & {
  id: string;
  field: FieldHook;
  dataTestSubj: string;
  idAria: string;
  isDisabled?: boolean;
  bottomRightContent?: React.ReactNode;
};

const BottomContentWrapper = styled(EuiFlexGroup)`
  ${({ theme }) => `
    padding: ${theme.eui.ruleMargins.marginSmall} 0;
  `}
`;

export const MarkdownEditorForm = React.memo(
  forwardRef<MarkdownEditorRef, MarkdownEditorFormProps>(
    ({ id, field, dataTestSubj, idAria, bottomRightContent }, ref) => {
      const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

      return (
        <>
          <EuiFormRow
            data-test-subj={dataTestSubj}
            describedByIds={idAria ? [idAria] : undefined}
            fullWidth
            error={errorMessage}
            helpText={field.helpText}
            isInvalid={isInvalid}
            label={field.label}
            labelAppend={field.labelAppend}
          >
            <MarkdownEditor
              ref={ref}
              ariaLabel={idAria}
              editorId={id}
              onChange={field.setValue}
              value={field.value as string}
              data-test-subj={`${dataTestSubj}-markdown-editor`}
            />
          </EuiFormRow>
          {bottomRightContent && (
            <BottomContentWrapper justifyContent={'flexEnd'}>
              <EuiFlexItem grow={false}>{bottomRightContent}</EuiFlexItem>
            </BottomContentWrapper>
          )}
        </>
      );
    }
  )
);
