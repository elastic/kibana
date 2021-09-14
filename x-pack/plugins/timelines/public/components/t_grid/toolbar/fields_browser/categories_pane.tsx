/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiInMemoryTable, EuiTitle } from '@elastic/eui';
import { noop } from 'lodash/fp';
import React, { useCallback, useRef } from 'react';
import styled from 'styled-components';
import {
  DATA_COLINDEX_ATTRIBUTE,
  DATA_ROWINDEX_ATTRIBUTE,
  onKeyDownFocusHandler,
} from '../../../../../common';
import type { BrowserFields } from '../../../../../common';
import { getCategoryColumns } from './category_columns';
import { CATEGORIES_PANE_CLASS_NAME, TABLE_HEIGHT } from './helpers';

import * as i18n from './translations';

const CategoryNames = styled.div<{ height: number; width: number }>`
  ${({ width }) => `width: ${width}px`};
  ${({ height }) => `height: ${height}px`};
  overflow-y: hidden;
  padding: 5px;
  thead {
    display: none;
  }
`;

CategoryNames.displayName = 'CategoryNames';

const Title = styled(EuiTitle)`
  padding-left: 5px;
`;

const H3 = styled.h3`
  text-align: left;
`;

Title.displayName = 'Title';

interface Props {
  /**
   * A map of categoryId -> metadata about the fields in that category,
   * filtered such that the name of every field in the category includes
   * the filter input (as a substring).
   */
  filteredBrowserFields: BrowserFields;
  /**
   * Invoked when the user clicks on the name of a category in the left-hand
   * side of the field browser
   */
  onCategorySelected: (categoryId: string) => void;
  /** The category selected on the left-hand side of the field browser */
  selectedCategoryId: string;
  timelineId: string;
  /** The width of the categories pane */
  width: number;
}

export const CategoriesPane = React.memo<Props>(
  ({ filteredBrowserFields, onCategorySelected, selectedCategoryId, timelineId, width }) => {
    const containerElement = useRef<HTMLDivElement | null>(null);
    const onKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        onKeyDownFocusHandler({
          colindexAttribute: DATA_COLINDEX_ATTRIBUTE,
          containerElement: containerElement?.current,
          event: e,
          maxAriaColindex: 1,
          maxAriaRowindex: Object.keys(filteredBrowserFields).length,
          onColumnFocused: noop,
          rowindexAttribute: DATA_ROWINDEX_ATTRIBUTE,
        });
      },
      [containerElement, filteredBrowserFields]
    );

    return (
      <>
        <Title size="xxs">
          <H3 data-test-subj="categories-pane-title">{i18n.CATEGORIES}</H3>
        </Title>

        <CategoryNames
          className={`${CATEGORIES_PANE_CLASS_NAME} euiTable--compressed`}
          data-test-subj="categories-container"
          onKeyDown={onKeyDown}
          ref={containerElement}
          width={width}
          height={TABLE_HEIGHT}
        >
          <EuiInMemoryTable
            className="eui-yScroll"
            columns={getCategoryColumns({
              filteredBrowserFields,
              onCategorySelected,
              selectedCategoryId,
              timelineId,
            })}
            items={Object.keys(filteredBrowserFields)
              .sort()
              .map((categoryId, i) => ({ categoryId, ariaRowindex: i + 1 }))}
            message={i18n.NO_FIELDS_MATCH}
            pagination={false}
            sorting={false}
            tableCaption={i18n.CATEGORIES}
          />
        </CategoryNames>
      </>
    );
  }
);

CategoriesPane.displayName = 'CategoriesPane';
