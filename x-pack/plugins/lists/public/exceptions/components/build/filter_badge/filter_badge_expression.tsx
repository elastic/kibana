/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { getDisplayValueFromFilter, getFieldDisplayValueFromFilter } from '@kbn/data-plugin/public';
import type { DataViewBase, Filter } from '@kbn/es-query';
import { isCombinedFilter } from '@kbn/es-query';
import { EuiTextColor } from '@elastic/eui';

import { getBooleanRelationType } from '../utils';

import { FilterBadgeGroup } from './filter_badge_group';
import { FilterContent } from './filter_content';
import { FilterBadgeInvalidPlaceholder } from './filter_badge_invalid';
import { bracketColorCss } from './filter_badge.styles';

export interface FilterBadgeExpressionProps {
  filter: Filter;
  shouldShowBrackets?: boolean;
  dataViews: DataViewBase[];
  filterLabelStatus?: string;
}

interface FilterBadgeContentProps {
  filter: Filter;
  dataViews: DataViewBase[];
  filterLabelStatus?: string;
}

const FilterBadgeContent = ({ filter, dataViews, filterLabelStatus }: FilterBadgeContentProps) => {
  const valueLabel = filterLabelStatus || getDisplayValueFromFilter(filter, dataViews);

  const fieldLabel = getFieldDisplayValueFromFilter(filter, dataViews);

  if (!valueLabel || !filter) {
    return <FilterBadgeInvalidPlaceholder />;
  }

  return (
    <FilterContent
      filter={filter}
      valueLabel={valueLabel}
      fieldLabel={fieldLabel}
      hideAlias={true}
    />
  );
};

export function FilterExpressionBadge({
  filter,
  shouldShowBrackets,
  dataViews,
  filterLabelStatus,
}: FilterBadgeExpressionProps) {
  const isCombined = isCombinedFilter(filter);
  const conditionalOperationType = getBooleanRelationType(filter);

  return conditionalOperationType && isCombined ? (
    <>
      {shouldShowBrackets && (
        <span>
          <EuiTextColor className={bracketColorCss}>(</EuiTextColor>
        </span>
      )}
      <FilterBadgeGroup
        filters={filter.meta?.params}
        dataViews={dataViews}
        filterLabelStatus={filterLabelStatus}
        booleanRelation={getBooleanRelationType(filter)}
      />
      {shouldShowBrackets && (
        <span>
          <EuiTextColor className={bracketColorCss}>)</EuiTextColor>
        </span>
      )}
    </>
  ) : (
    <span>
      <FilterBadgeContent
        filter={filter}
        dataViews={dataViews}
        filterLabelStatus={filterLabelStatus}
      />
    </span>
  );
}
