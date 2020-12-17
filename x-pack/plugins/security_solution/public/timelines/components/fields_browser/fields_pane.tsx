/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';

import { BrowserFields } from '../../../common/containers/source';
import { ColumnHeaderOptions } from '../../../timelines/store/timeline/model';
import { timelineActions } from '../../../timelines/store/timeline';
import { OnUpdateColumns } from '../timeline/events';
import { Category } from './category';
import { FieldBrowserProps } from './types';
import { getFieldItems } from './field_items';
import { FIELDS_PANE_WIDTH, TABLE_HEIGHT } from './helpers';

import * as i18n from './translations';

const NoFieldsPanel = styled.div`
  background-color: ${(props) => props.theme.eui.euiColorLightestShade};
  width: ${FIELDS_PANE_WIDTH}px;
  height: ${TABLE_HEIGHT}px;
`;

NoFieldsPanel.displayName = 'NoFieldsPanel';

const NoFieldsFlexGroup = styled(EuiFlexGroup)`
  height: 100%;
`;

NoFieldsFlexGroup.displayName = 'NoFieldsFlexGroup';

type Props = Pick<FieldBrowserProps, 'onFieldSelected' | 'timelineId'> & {
  columnHeaders: ColumnHeaderOptions[];
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
  /** The text displayed in the search input */
  /** Invoked when a user chooses to view a new set of columns in the timeline */
  onUpdateColumns: OnUpdateColumns;
  searchInput: string;
  /**
   * The category selected on the left-hand side of the field browser
   */
  selectedCategoryId: string;
  /** The width field browser */
  width: number;
};
export const FieldsPane = React.memo<Props>(
  ({
    columnHeaders,
    filteredBrowserFields,
    onCategorySelected,
    onUpdateColumns,
    searchInput,
    selectedCategoryId,
    timelineId,
    width,
  }) => {
    const dispatch = useDispatch();

    const toggleColumn = useCallback(
      (column: ColumnHeaderOptions) => {
        if (columnHeaders.some((c) => c.id === column.id)) {
          dispatch(
            timelineActions.removeColumn({
              columnId: column.id,
              id: timelineId,
            })
          );
        } else {
          dispatch(
            timelineActions.upsertColumn({
              column,
              id: timelineId,
              index: 1,
            })
          );
        }
      },
      [columnHeaders, dispatch, timelineId]
    );

    const filteredBrowserFieldsExists = useMemo(
      () => Object.keys(filteredBrowserFields).length > 0,
      [filteredBrowserFields]
    );

    if (filteredBrowserFieldsExists) {
      return (
        <Category
          categoryId={selectedCategoryId}
          data-test-subj="category"
          filteredBrowserFields={filteredBrowserFields}
          fieldItems={getFieldItems({
            browserFields: filteredBrowserFields,
            category: filteredBrowserFields[selectedCategoryId],
            categoryId: selectedCategoryId,
            columnHeaders,
            highlight: searchInput,
            onUpdateColumns,
            timelineId,
            toggleColumn,
          })}
          width={width}
          onCategorySelected={onCategorySelected}
          onUpdateColumns={onUpdateColumns}
          timelineId={timelineId}
        />
      );
    }

    return (
      <NoFieldsPanel>
        <NoFieldsFlexGroup alignItems="center" gutterSize="none" justifyContent="center">
          <EuiFlexItem grow={false}>
            <h3 data-test-subj="no-fields-match">{i18n.NO_FIELDS_MATCH_INPUT(searchInput)}</h3>
          </EuiFlexItem>
        </NoFieldsFlexGroup>
      </NoFieldsPanel>
    );
  }
);

FieldsPane.displayName = 'FieldsPane';
