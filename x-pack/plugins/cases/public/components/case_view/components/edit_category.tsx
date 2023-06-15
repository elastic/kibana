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
} from '@elastic/eui';
import styled, { css } from 'styled-components';
import * as i18n from '../../category/translations';
import { CategoryViewer } from '../../category/category_viewer_component';
import { CategoryComponent } from '../../category/category_component';
import { useCasesContext } from '../../cases_context/use_cases_context';

export interface EditCategoryProps {
  isLoading: boolean;
  onSubmit: (category: string) => void;
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
  const [selectedCategory, setSelectedCategory] = useState<string | null | undefined>(category);

  const onSubmitCategory = () => {
    if (selectedCategory) {
      onSubmit(selectedCategory);
      setIsEditCategory(false);
    }
  };

  const handleOnChange = useCallback(
    (cat: string) => {
      setSelectedCategory(cat);
    },
    [setSelectedCategory]
  );

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
          {isLoading && <EuiLoadingSpinner data-test-subj="category-loading" />}
          {!isLoading && permissions.update && (
            <EuiFlexItem data-test-subj="category-edit" grow={false}>
              <EuiButtonIcon
                data-test-subj="category-edit-button"
                aria-label={i18n.EDIT_CATEGORIES_ARIA}
                iconType={'pencil'}
                onClick={setIsEditCategory.bind(null, true)}
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
              <EuiFlexItem>
                <CategoryComponent
                  category={selectedCategory}
                  onChange={handleOnChange}
                  isLoading={isLoading}
                />
              </EuiFlexItem>
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
                      onClick={setIsEditCategory.bind(null, false)}
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
