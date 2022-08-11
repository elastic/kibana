/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiSpacer,
  EuiCallOut,
} from '@elastic/eui';
import { DocLinksStart } from '@kbn/core/public';

import { RuntimeField } from '../../types';
import { FormState } from '../runtime_field_form';
import {
  RuntimeFieldEditor,
  Props as RuntimeFieldEditorProps,
} from '../runtime_field_editor/runtime_field_editor';

const geti18nTexts = (field?: RuntimeField) => {
  return {
    flyoutTitle: field
      ? i18n.translate('xpack.runtimeFields.editor.flyoutEditFieldTitle', {
          defaultMessage: 'Edit {fieldName} field',
          values: {
            fieldName: field.name,
          },
        })
      : i18n.translate('xpack.runtimeFields.editor.flyoutDefaultTitle', {
          defaultMessage: 'Create new field',
        }),
    closeButtonLabel: i18n.translate('xpack.runtimeFields.editor.flyoutCloseButtonLabel', {
      defaultMessage: 'Close',
    }),
    saveButtonLabel: i18n.translate('xpack.runtimeFields.editor.flyoutSaveButtonLabel', {
      defaultMessage: 'Save',
    }),
    formErrorsCalloutTitle: i18n.translate('xpack.runtimeFields.editor.validationErrorTitle', {
      defaultMessage: 'Fix errors in form before continuing.',
    }),
  };
};

export interface Props {
  /**
   * Handler for the "save" footer button
   */
  onSave: (field: RuntimeField) => void;
  /**
   * Handler for the "cancel" footer button
   */
  onCancel: () => void;
  /**
   * The docLinks start service from core
   */
  docLinks: DocLinksStart;
  /**
   * An optional runtime field to edit
   */
  defaultValue?: RuntimeField;
  /**
   * Optional context object
   */
  ctx?: RuntimeFieldEditorProps['ctx'];
}

export const RuntimeFieldEditorFlyoutContent = ({
  onSave,
  onCancel,
  docLinks,
  defaultValue: field,
  ctx,
}: Props) => {
  const i18nTexts = geti18nTexts(field);

  const [formState, setFormState] = useState<FormState>({
    isSubmitted: false,
    isValid: field ? true : undefined,
    submit: field
      ? async () => ({ isValid: true, data: field })
      : async () => ({ isValid: false, data: {} as RuntimeField }),
  });
  const { submit, isValid: isFormValid, isSubmitted } = formState;

  const onSaveField = useCallback(async () => {
    const { isValid, data } = await submit();

    if (isValid) {
      onSave(data);
    }
  }, [submit, onSave]);

  return (
    <>
      <EuiFlyoutHeader>
        <EuiTitle size="m" data-test-subj="flyoutTitle">
          <h2 id="runtimeFieldEditorEditTitle">{i18nTexts.flyoutTitle}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <RuntimeFieldEditor
          docLinks={docLinks}
          defaultValue={field}
          onChange={setFormState}
          ctx={ctx}
        />
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        {isSubmitted && !isFormValid && (
          <>
            <EuiCallOut
              title={i18nTexts.formErrorsCalloutTitle}
              color="danger"
              iconType="cross"
              data-test-subj="formError"
            />
            <EuiSpacer size="m" />
          </>
        )}

        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="cross"
              flush="left"
              onClick={() => onCancel()}
              data-test-subj="closeFlyoutButton"
            >
              {i18nTexts.closeButtonLabel}
            </EuiButtonEmpty>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButton
              color="primary"
              onClick={() => onSaveField()}
              data-test-subj="saveFieldButton"
              disabled={isSubmitted && !isFormValid}
              fill
            >
              {i18nTexts.saveButtonLabel}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
