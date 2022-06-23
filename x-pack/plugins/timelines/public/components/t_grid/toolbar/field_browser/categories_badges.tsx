/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import styled from 'styled-components';
import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

interface CategoriesBadgesProps {
  setSelectedCategoryIds: (categoryIds: string[]) => void;
  selectedCategoryIds: string[];
}

const CategoriesBadgesGroup = styled(EuiFlexGroup)`
  margin-top: ${({ theme }) => theme.eui.euiSizeXS};
  min-height: 24px;
`;
CategoriesBadgesGroup.displayName = 'CategoriesBadgesGroup';

const CategoriesBadgesComponent: React.FC<CategoriesBadgesProps> = ({
  setSelectedCategoryIds,
  selectedCategoryIds,
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
    <CategoriesBadgesGroup data-test-subj="category-badges" gutterSize="xs" wrap>
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
    </CategoriesBadgesGroup>
  );
};

export const CategoriesBadges = React.memo(CategoriesBadgesComponent);
