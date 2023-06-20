/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
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
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { useGetCategories } from '../../../containers/use_get_categories';
import * as i18n from '../../category/translations';
import { CategoryViewer } from '../../category/category_viewer_component';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { CategoryFormField } from '../../category/category_form_field';

export interface EditCategoryProps {
  isLoading: boolean;
  onSubmit: (category?: string | null) => void;
  category?: string | null;
}

export const EditCategory = React.memo(({ isLoading, onSubmit, category }: EditCategoryProps) => {
  const { permissions } = useCasesContext();
  const [isEditCategory, setIsEditCategory] = useState(false);
  const { data: categories = [], isLoading: isLoadingCategories } = useGetCategories();

  const { form } = useForm({
    defaultValue: { category },
  });

  const onEdit = () => {
    setIsEditCategory(true);
  };

  const onCancel = () => {
    setIsEditCategory(false);
  };

  const onSubmitCategory = async () => {
    const { isValid, data } = await form.submit();

    if (isValid) {
      const newCategory = data.category != null ? data.category : null;

      onSubmit(newCategory);
      form.reset({ defaultValue: data });
    }

    setIsEditCategory(false);
  };

  const isLoadingAll = isLoading || isLoadingCategories;
  const isCategoryValid = form.isValid;

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
                <CategoryViewer category={category} />
              ) : (
                <EuiText size="xs" data-test-subj="no-categories">
                  {i18n.NO_CATEGORIES}
                </EuiText>
              )}
            </EuiFlexItem>
          )}
          {isEditCategory && (
            <EuiFlexGroup data-test-subj="edit-category" direction="column">
              <Form form={form}>
                <CategoryFormField isLoading={isLoadingAll} availableCategories={categories} />
              </Form>
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
