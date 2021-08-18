/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiScreenReaderOnly, EuiTitle } from '@elastic/eui';
import React from 'react';

import { CountBadge, getFieldBrowserCategoryTitleClassName, getFieldCount } from './helpers';
import type { BrowserFields, OnUpdateColumns } from '../../../../../common';

import { ViewAllButton } from './category_columns';
import * as i18n from './translations';

interface Props {
  /** The title of the category */
  categoryId: string;
  /**
   * A map of categoryId -> metadata about the fields in that category,
   * filtered such that the name of every field in the category includes
   * the filter input (as a substring).
   */
  filteredBrowserFields: BrowserFields;
  onUpdateColumns: OnUpdateColumns;

  /** The timeline associated with this field browser */
  timelineId: string;
}

export const CategoryTitle = React.memo<Props>(
  ({ filteredBrowserFields, categoryId, onUpdateColumns, timelineId }) => (
    <EuiFlexGroup alignItems="center" data-test-subj="category-title-container" gutterSize="none">
      <EuiFlexItem grow={false}>
        <EuiScreenReaderOnly data-test-subj="screenReaderOnlyCategory">
          <p>{i18n.CATEGORY}</p>
        </EuiScreenReaderOnly>
        <EuiTitle
          className={getFieldBrowserCategoryTitleClassName({ categoryId, timelineId })}
          data-test-subj="selected-category-title"
          size="xxs"
        >
          <h3>{categoryId}</h3>
        </EuiTitle>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <CountBadge data-test-subj="selected-category-count-badge" color="hollow">
          {getFieldCount(filteredBrowserFields[categoryId])}
        </CountBadge>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <ViewAllButton
          categoryId={categoryId}
          browserFields={filteredBrowserFields}
          onUpdateColumns={onUpdateColumns}
          timelineId={timelineId}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  )
);

CategoryTitle.displayName = 'CategoryTitle';
