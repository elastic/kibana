/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/** @jsx jsx */
import { jsx } from '@emotion/react';
import React, { useCallback } from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { withTheme, EuiTheme } from '@kbn/kibana-react-plugin/common';
import { styles } from './categories_badges.styles';

export interface CategoriesBadgesProps {
  setSelectedCategoryIds: (categoryIds: string[]) => void;
  selectedCategoryIds: string[];
}

type CategoriesBadgesWithThemeProps = CategoriesBadgesProps & { theme: EuiTheme };

const CategoriesBadgesComponent: React.FC<CategoriesBadgesWithThemeProps> = ({
  setSelectedCategoryIds,
  selectedCategoryIds,
  theme,
}) => {
  const onUnselectCategory = useCallback(
    (categoryId: string) => {
      setSelectedCategoryIds(
        selectedCategoryIds.filter((selectedCategoryId) => selectedCategoryId !== categoryId)
      );
    },
    [setSelectedCategoryIds, selectedCategoryIds]
  );

  return (
    <EuiFlexGroup
      css={styles.badgesGroup({ theme })}
      data-test-subj="category-badges"
      gutterSize="xs"
      wrap
    >
      {selectedCategoryIds.map((categoryId) => (
        <EuiFlexItem grow={false} key={categoryId}>
          <EuiBadge
            iconType="cross"
            iconSide="right"
            iconOnClick={() => onUnselectCategory(categoryId)}
            iconOnClickAriaLabel="unselect category"
            data-test-subj={`category-badge-${categoryId}`}
            closeButtonProps={{ 'data-test-subj': `category-badge-unselect-${categoryId}` }}
          >
            {categoryId}
          </EuiBadge>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

export const CategoriesBadges = React.memo(withTheme(CategoriesBadgesComponent));
