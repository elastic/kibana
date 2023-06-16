/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiText,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiLoadingSpinner,
  EuiFormRow,
} from '@elastic/eui';
import styled, { css } from 'styled-components';
import { MAX_CATEGORY_LENGTH } from '../../../../common/constants';
import { useGetCategories } from '../../../containers/use_get_categories';
import * as i18n from '../../category/translations';
import { CategoryViewer } from '../../category/category_viewer_component';
import { CategoryComponent } from '../../category/category_component';
import { useCasesContext } from '../../cases_context/use_cases_context';
import { MAX_LENGTH_ERROR } from '../../category/translations';

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
  const [isInvalid, setIsInvalid] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null | undefined>(category);
  const { data: categories = [], isLoading: isLoadingCategories } = useGetCategories();

  const errorMessage = MAX_LENGTH_ERROR('category', MAX_CATEGORY_LENGTH);

  const onEdit = () => {
    setIsInvalid(false);
    setIsEditCategory(true);
  };

  const onCancel = () => {
    setIsInvalid(false);
    setIsEditCategory(false);
  };

  const validateCategory = (cat: string) => {
    if (cat.length > MAX_CATEGORY_LENGTH) {
      setIsInvalid(true);
    } else {
      setIsInvalid(false);
    }
  };

  const onSubmitCategory = () => {
    if (selectedCategory != null) {
      validateCategory(selectedCategory);
      return;
    }

    setIsInvalid(false);
    setIsEditCategory(false);
    onSubmit(selectedCategory);
  };

  const handleOnChange = useCallback(
    (cat: string) => {
      validateCategory(cat);
      setSelectedCategory(cat);
    },
    [setSelectedCategory]
  );

  const isLoadingAll = isLoading || isLoadingCategories;

  return (
    <EuiFlexItem grow={false}>
      <EuiText data-test-subj="case-view-categories-list">
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
            <EuiFlexItem data-test-subj="category-edit" grow={false}>
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
              <CategoryViewer category={category} color="hollow" />
            </EuiFlexItem>
          )}
          {isEditCategory && (
            <ColumnFlexGroup data-test-subj="edit-tags" direction="column">
              <EuiFormRow error={errorMessage} isInvalid={isInvalid} fullWidth>
                <CategoryComponent
                  category={selectedCategory}
                  onChange={handleOnChange}
                  isLoading={isLoadingAll}
                  availableCategories={categories}
                />
              </EuiFormRow>
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
