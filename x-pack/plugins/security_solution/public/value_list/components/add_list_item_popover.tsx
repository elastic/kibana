/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useState } from 'react';
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
import { useCreateListItemMutation } from '../hooks/use_create_list_item';
import { useAppToasts } from '../../common/hooks/use_app_toasts';

export const AddListItemPopover = ({ listId }: { listId: string }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { addSuccess, addError } = useAppToasts();
  const createListItemMutation = useCreateListItemMutation({
    onSuccess: () => {
      addSuccess('Succesfully added list item');
    },
    onError: () => {
      addError('Failed to add list item');
    },
  });
  const formik = useFormik({
    initialValues: {
      value: '',
    },
    validate: (values) => {
      if (values.value.trim() === '') {
        return { value: 'Value is required' };
      }
    },
    onSubmit: async (values) => {
      await createListItemMutation.mutateAsync({ listId, value: values.value });
      setIsPopoverOpen(false);
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
          onClick={() => setIsPopoverOpen(true)}
        >
          Add list item
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
                label="Value"
                id="value-list-item-value"
                isInvalid={!!formik.errors.value}
                error={[formik.errors.value]}
              >
                <EuiFieldText
                  onChange={formik.handleChange}
                  value={formik.values.value}
                  name="value"
                  icon="listAdd"
                  placeholder="Add list item.."
                  isInvalid={!!formik.errors.value}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFormRow hasEmptyLabelSpace>
                <EuiButton isLoading={createListItemMutation.isLoading} type="submit">
                  {createListItemMutation.isLoading ? 'Adding...' : 'Add'}
                </EuiButton>
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiForm>
      </div>
    </EuiPopover>
  );
};
