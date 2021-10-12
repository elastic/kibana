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
import type { IntegrationCategoryCount } from '../../../../../../../../../../src/plugins/custom_integrations/common';
import { INTEGRATION_CATEGORY_DISPLAY } from '../../../../../../../../../../src/plugins/custom_integrations/common';

interface ALL_CATEGORY {
  id: '';
  count: number;
}

export type CategoryFacet = IntegrationCategoryCount | ALL_CATEGORY;

export interface Props {
  showCounts: boolean;
  isLoading?: boolean;
  categories: CategoryFacet[];
  selectedCategory: string;
  onCategoryChange: (category: CategoryFacet) => unknown;
}

export function CategoryFacets({
  showCounts,
  isLoading,
  categories,
  selectedCategory,
  onCategoryChange,
}: Props) {
  const controls = (
    <EuiFacetGroup>
      {isLoading ? (
        <Loading />
      ) : (
        categories.map((category) => {
          let title;

          if (category.id === 'updates_available') {
            title = i18n.translate('xpack.fleet.epmList.updatesAvailableFilterLinkText', {
              defaultMessage: 'Updates available',
            });
          } else if (category.id === '') {
            title = i18n.translate('xpack.fleet.epmList.allPackagesFilterLinkText', {
              defaultMessage: 'All',
            });
          } else {
            title = INTEGRATION_CATEGORY_DISPLAY[category.id];
          }
          return (
            <EuiFacetButton
              isSelected={category.id === selectedCategory}
              key={category.id}
              id={category.id}
              quantity={showCounts ? category.count : undefined}
              onClick={() => onCategoryChange(category)}
            >
              {title}
            </EuiFacetButton>
          );
        })
      )}
    </EuiFacetGroup>
  );

  return controls;
}
