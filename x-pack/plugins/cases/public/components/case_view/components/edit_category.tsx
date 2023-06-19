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
import styled, { css } from 'styled-components';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { useGetCategories } from '../../../containers/use_get_categories';
import * as i18n from '../../category/translations';
import { CategoryViewer } from '../../category/category_viewer_component';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { CategoryFormField } from '../../category/category_form_field';

export interface EditCategoryProps {
  isLoading: boolean;
  onSubmit: (category: string | null | undefined) => void;
  category: string | null | undefined;
}

const MyFlexGroup = styled(EuiFlexGroup)`
  ${({ theme }) => css`
    width: 100%;
    p {
      font-size: ${theme.eui.euiSizeM};
      margin-block-end: unset;
    }
  `}
`;

const ColumnFlexGroup = styled(EuiFlexGroup)`
  ${({ theme }) => css`
    & {
      max-width: 100%;
      @media only screen and (max-width: ${theme.eui.euiBreakpoints.m}) {
        flex-direction: row;
      }
    }
  `}
`;

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
        <MyFlexGroup gutterSize="none" data-test-subj="case-category">
          {!category && !isEditCategory && (
            <p data-test-subj="no-categories">{i18n.NO_CATEGORIES}</p>
          )}
          {!isEditCategory && category && (
            <EuiFlexItem>
              <CategoryViewer category={category} />
            </EuiFlexItem>
          )}
          {isEditCategory && (
            <ColumnFlexGroup data-test-subj="edit-category" direction="column">
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
            </ColumnFlexGroup>
          )}
        </MyFlexGroup>
      </EuiText>
    </EuiFlexItem>
  );
});

EditCategory.displayName = 'EditCategory';
