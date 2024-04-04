/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import {
  EuiButton,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiPopover,
} from '@elastic/eui';
import { useFormik } from 'formik';
import { useCreateListItemMutation } from '@kbn/securitysolution-list-hooks';
import { useAppToasts } from '../../common/hooks/use_app_toasts';
import { useKibana } from '../../common/lib/kibana/kibana_react';
import {
  ADD_LIST_ITEM,
  SUCCESFULLY_ADDED_ITEM,
  VALUE_REQUIRED,
  VALUE_LABEL,
  ADD_VALUE_LIST_PLACEHOLDER,
  ADDING_LIST_ITEM_BUTTON,
  ADD_LIST_ITEM_BUTTON,
} from '../translations';

export const AddListItemPopover = ({ listId }: { listId: string }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { addSuccess, addError } = useAppToasts();
  const http = useKibana().services.http;
  const createListItemMutation = useCreateListItemMutation({
    onSuccess: () => {
      addSuccess(SUCCESFULLY_ADDED_ITEM);
    },
    onError: (error) => {
      addError(error, {
        title: error.message,
        toastMessage: error?.body?.message ?? error.message,
      });
    },
  });
  const formik = useFormik({
    initialValues: {
      value: '',
    },
    validate: (values) => {
      if (values.value.trim() === '') {
        return { value: VALUE_REQUIRED };
      }
    },
    onSubmit: async (values) => {
      await createListItemMutation.mutateAsync({ listId, value: values.value, http });
      setIsPopoverOpen(false);
      formik.resetForm();
    },
  });

  return (
    <EuiPopover
      initialFocus="#value-list-item-value"
      button={
        <EuiButton
          iconSide="right"
          fill
          iconType="arrowDown"
          data-test-subj="value-list-item-add-button-show-popover"
          onClick={() => setIsPopoverOpen(true)}
        >
          {ADD_LIST_ITEM}
        </EuiButton>
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
    >
      <div style={{ width: 500 }}>
        <EuiForm onSubmit={formik.handleSubmit} component="form">
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiFormRow
                label={VALUE_LABEL}
                id="value-list-item-value"
                isInvalid={!!formik.errors.value}
                error={[formik.errors.value]}
              >
                <EuiFieldText
                  autoComplete="off"
                  onChange={formik.handleChange}
                  value={formik.values.value}
                  name="value"
                  icon="listAdd"
                  data-test-subj="value-list-item-add-input"
                  placeholder={ADD_VALUE_LIST_PLACEHOLDER}
                  isInvalid={!!formik.errors.value}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFormRow hasEmptyLabelSpace>
                <EuiButton
                  data-test-subj="value-list-item-add-button-submit"
                  isLoading={createListItemMutation.isLoading}
                  type="submit"
                >
                  {createListItemMutation.isLoading
                    ? ADDING_LIST_ITEM_BUTTON
                    : ADD_LIST_ITEM_BUTTON}
                </EuiButton>
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiForm>
      </div>
    </EuiPopover>
  );
};
