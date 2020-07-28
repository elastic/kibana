/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiFacetButton, EuiFacetGroup } from '@elastic/eui';
import React from 'react';
import { Loading } from '../../../../components';
import { CategorySummaryItem, CategorySummaryList } from '../../../../types';

export function CategoryFacets({
  isLoading,
  categories,
  selectedCategory,
  onCategoryChange,
}: {
  isLoading?: boolean;
  categories: CategorySummaryList;
  selectedCategory: string;
  onCategoryChange: (category: CategorySummaryItem) => unknown;
}) {
  const controls = (
    <EuiFacetGroup>
      {isLoading ? (
        <Loading />
      ) : (
        categories.map((category) => (
          <EuiFacetButton
            isSelected={category.id === selectedCategory}
            key={category.id}
            id={category.id}
            quantity={category.count}
            onClick={() => onCategoryChange(category)}
          >
            {category.title}
          </EuiFacetButton>
        ))
      )}
    </EuiFacetGroup>
  );

  return controls;
}
