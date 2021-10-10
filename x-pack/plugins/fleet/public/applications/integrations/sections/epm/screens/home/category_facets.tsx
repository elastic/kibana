/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFacetButton, EuiFacetGroup } from '@elastic/eui';
import React from 'react';

import { i18n } from '@kbn/i18n';

import { Loading } from '../../../../components';
import type { IntegrationCategory } from '../../../../../../../../../../src/plugins/custom_integrations/common';

export interface CategoryFacet {
  count: number;
  id: IntegrationCategory | 'Updates available' | '' | string;
  title: string;
}

export const ALL_CATEGORY = {
  id: '',
  title: i18n.translate('xpack.fleet.epmList.allPackagesFilterLinkText', {
    defaultMessage: 'All',
  }),
};

export function CategoryFacets({
  isLoading,
  categories,
  selectedCategory,
  onCategoryChange,
}: {
  isLoading?: boolean;
  categories: CategoryFacet[];
  selectedCategory: string;
  onCategoryChange: (category: CategoryFacet) => unknown;
}) {
  const controls = (
    <EuiFacetGroup>
      {isLoading ? (
        <Loading />
      ) : (
        categories.map((category) => {
          return (
            <EuiFacetButton
              isSelected={category.id === selectedCategory}
              key={category.id}
              id={category.id}
              quantity={category.count}
              onClick={() => onCategoryChange(category)}
            >
              {category.title}
            </EuiFacetButton>
          );
        })
      )}
    </EuiFacetGroup>
  );

  return controls;
}
