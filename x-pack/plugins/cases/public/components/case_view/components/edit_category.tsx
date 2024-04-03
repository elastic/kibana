/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiText,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiLoadingSpinner,
} from '@elastic/eui';
import type { FormHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { useGetCategories } from '../../../containers/use_get_categories';
import * as i18n from '../../category/translations';
import { CategoryViewer } from '../../category/category_viewer_component';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { CategoryFormField } from '../../category/category_form_field';
import { RemovableItem } from '../../removable_item/removable_item';

export interface EditCategoryProps {
  isLoading: boolean;
  onSubmit: (category?: string | null) => void;
  category?: string | null;
}

interface CategoryFormState {
  isValid: boolean | undefined;
  submit: FormHook<{ category?: EditCategoryProps['category'] }>['submit'];
}

type CategoryFormWrapper = Pick<EditCategoryProps, 'category' | 'isLoading'> & {
  availableCategories: string[];
  onChange?: (state: CategoryFormState) => void;
};

const CategoryFormWrapper: React.FC<CategoryFormWrapper> = ({
  category,
  availableCategories,
  isLoading,
  onChange,
}) => {
  const { form } = useForm({
    defaultValue: { category },
  });

  const { submit, isValid: isFormValid } = form;

  useEffect(() => {
    if (onChange) {
      onChange({ isValid: isFormValid, submit });
    }
  }, [isFormValid, onChange, submit]);

  return (
    <Form form={form}>
      <CategoryFormField isLoading={isLoading} availableCategories={availableCategories} />
    </Form>
  );
};

CategoryFormWrapper.displayName = 'CategoryFormWrapper';

export const EditCategory = React.memo(({ isLoading, onSubmit, category }: EditCategoryProps) => {
  const { permissions } = useCasesContext();
  const [isEditCategory, setIsEditCategory] = useState(false);
  const { data: categories = [], isLoading: isLoadingCategories } = useGetCategories();

  const [formState, setFormState] = useState<CategoryFormState>({
    isValid: undefined,
    submit: async () => ({ isValid: false, data: {} }),
  });

  const onEdit = () => {
    setIsEditCategory(true);
  };

  const onCancel = () => {
    setIsEditCategory(false);
  };

  const removeCategory = () => {
    onSubmit(null);
    setIsEditCategory(false);
  };

  const onSubmitCategory = async () => {
    const { isValid, data } = await formState.submit();

    if (isValid) {
      onSubmit(data.category?.trim() ?? null);
    }

    setIsEditCategory(false);
  };

  const isLoadingAll = isLoading || isLoadingCategories;
  const isCategoryValid = formState.isValid;

  return (
    <EuiFlexItem grow={false}>
      <EuiText data-test-subj="cases-categories">
        <EuiFlexGroup
          alignItems="center"
          gutterSize="none"
          justifyContent="spaceBetween"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <h4>{i18n.CATEGORY}</h4>
          </EuiFlexItem>
          {isLoadingAll && <EuiLoadingSpinner data-test-subj="category-loading" />}
          {!isLoadingAll && permissions.update && (
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                data-test-subj="category-edit-button"
                aria-label={i18n.EDIT_CATEGORIES_ARIA}
                iconType={'pencil'}
                onClick={onEdit}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiHorizontalRule margin="xs" />
        <EuiFlexGroup gutterSize="none" data-test-subj="case-category">
          {!isEditCategory && (
            <EuiFlexItem>
              {category ? (
                <RemovableItem
                  onRemoveItem={removeCategory}
                  tooltipContent={i18n.REMOVE_CATEGORY}
                  buttonAriaLabel={i18n.REMOVE_CATEGORY_ARIA_LABEL}
                  dataTestSubjPrefix="category"
                >
                  <CategoryViewer category={category} />
                </RemovableItem>
              ) : (
                <EuiText size="xs" data-test-subj="no-categories">
                  {i18n.NO_CATEGORIES}
                </EuiText>
              )}
            </EuiFlexItem>
          )}
          {isEditCategory && (
            <EuiFlexGroup data-test-subj="edit-category" direction="column">
              <CategoryFormWrapper
                onChange={setFormState}
                category={category}
                availableCategories={categories}
                isLoading={isLoadingAll}
              />
              <EuiFlexItem>
                <EuiFlexGroup alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      color="success"
                      data-test-subj="edit-category-submit"
                      fill
                      iconType="save"
                      onClick={onSubmitCategory}
                      size="s"
                      disabled={!isCategoryValid || isLoadingAll}
                    >
                      {i18n.SAVE}
                    </EuiButton>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      data-test-subj="edit-category-cancel"
                      iconType="cross"
                      onClick={onCancel}
                      size="s"
                    >
                      {i18n.CANCEL}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </EuiFlexGroup>
      </EuiText>
    </EuiFlexItem>
  );
});

EditCategory.displayName = 'EditCategory';
