/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalFooter,
  EuiButton,
  EuiButtonEmpty,
  EuiSpacer,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';

import type { BrowserFields } from '../../../../../common/search_strategy';
import type { FieldBrowserProps, ColumnHeaderOptions } from '../../../../../common/types';
import { Search } from './search';

import { CLOSE_BUTTON_CLASS_NAME, FIELD_BROWSER_WIDTH, RESET_FIELDS_CLASS_NAME } from './helpers';
import { tGridActions, tGridSelectors } from '../../../../store/t_grid';

import * as i18n from './translations';
import { useDeepEqualSelector } from '../../../../hooks/use_selector';
import { CategoriesSelector } from './categories_selector';
import { FieldTable } from './field_table';
import { CategoriesBadges } from './categories_badges';

type Props = Pick<FieldBrowserProps, 'timelineId' | 'browserFields' | 'width' | 'options'> & {
  /**
   * The current timeline column headers
   */
  columnHeaders: ColumnHeaderOptions[];
  /**
   * A map of categoryId -> metadata about the fields in that category,
   * filtered such that the name of every field in the category includes
   * the filter input (as a substring).
   */
  filteredBrowserFields: BrowserFields;
  /**
   * When true, a busy spinner will be shown to indicate the field browser
   * is searching for fields that match the specified `searchInput`
   */
  isSearching: boolean;
  /** The text displayed in the search input */
  searchInput: string;
  /** The text actually being applied to the result set, a debounced version of searchInput */
  appliedFilterInput: string;
  /**
   * The category selected on the left-hand side of the field browser
   */
  selectedCategoryIds: string[];
  /**
   * Invoked when the user clicks on the name of a category in the left-hand
   * side of the field browser
   */
  setSelectedCategoryIds: (categoryIds: string[]) => void;
  /**
   * Hides the field browser when invoked
   */
  onHide: () => void;
  /**
   * Invoked when the user types in the search input
   */
  onSearchInputChange: (newSearchInput: string) => void;

  /**
   * Focus will be restored to this button if the user presses Escape or clicks
   * the close button. Focus will NOT be restored if the user clicks outside
   * of the popover.
   */
  restoreFocusTo: React.MutableRefObject<HTMLButtonElement | null>;
};

/**
 * This component has no internal state, but it uses lifecycle methods to
 * set focus to the search input, scroll to the selected category, etc
 */
const FieldsBrowserComponent: React.FC<Props> = ({
  columnHeaders,
  filteredBrowserFields,
  isSearching,
  setSelectedCategoryIds,
  onSearchInputChange,
  onHide,
  options,
  restoreFocusTo,
  searchInput,
  appliedFilterInput,
  selectedCategoryIds,
  timelineId,
  width = FIELD_BROWSER_WIDTH,
}) => {
  const dispatch = useDispatch();

  const onUpdateColumns = useCallback(
    (columns: ColumnHeaderOptions[]) =>
      dispatch(tGridActions.updateColumns({ id: timelineId, columns })),
    [dispatch, timelineId]
  );

  const closeAndRestoreFocus = useCallback(() => {
    onHide();
    setTimeout(() => {
      // restore focus on the next tick after we have escaped the EuiFocusTrap
      restoreFocusTo.current?.focus();
    }, 0);
  }, [onHide, restoreFocusTo]);

  const getManageTimeline = useMemo(() => tGridSelectors.getManageTimelineById(), []);
  const { dataViewId, defaultColumns } = useDeepEqualSelector((state) =>
    getManageTimeline(state, timelineId)
  );

  const onResetColumns = useCallback(() => {
    onUpdateColumns(defaultColumns);
    closeAndRestoreFocus();
  }, [onUpdateColumns, closeAndRestoreFocus, defaultColumns]);

  /** Invoked when the user types in the input to filter the field browser */
  const onInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onSearchInputChange(event.target.value);
    },
    [onSearchInputChange]
  );

  const [CreateFieldButton, getFieldTableColumns] = [
    options?.createFieldButton,
    options?.getFieldTableColumns,
  ];

  return (
    <EuiModal onClose={closeAndRestoreFocus} style={{ width, maxWidth: width }}>
      <div data-test-subj="fields-browser-container" className="eui-yScroll">
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <h1>{i18n.FIELDS_BROWSER}</h1>
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <EuiFlexGroup gutterSize="m">
            <EuiFlexItem>
              <Search
                data-test-subj="header"
                isSearching={isSearching}
                onSearchInputChange={onInputChange}
                searchInput={searchInput}
                timelineId={timelineId}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <CategoriesSelector
                filteredBrowserFields={filteredBrowserFields}
                setSelectedCategoryIds={setSelectedCategoryIds}
                selectedCategoryIds={selectedCategoryIds}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {CreateFieldButton && dataViewId != null && dataViewId.length > 0 && (
                <CreateFieldButton onClick={onHide} />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>

          <CategoriesBadges
            selectedCategoryIds={selectedCategoryIds}
            setSelectedCategoryIds={setSelectedCategoryIds}
          />

          <EuiSpacer size="l" />

          <FieldTable
            timelineId={timelineId}
            columnHeaders={columnHeaders}
            filteredBrowserFields={filteredBrowserFields}
            searchInput={appliedFilterInput}
            selectedCategoryIds={selectedCategoryIds}
            getFieldTableColumns={getFieldTableColumns}
          />
        </EuiModalBody>

        <EuiModalFooter>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              className={RESET_FIELDS_CLASS_NAME}
              data-test-subj="reset-fields"
              onClick={onResetColumns}
            >
              {i18n.RESET_FIELDS}
            </EuiButtonEmpty>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={closeAndRestoreFocus}
              aria-label={i18n.CLOSE}
              className={CLOSE_BUTTON_CLASS_NAME}
              data-test-subj="close"
            >
              {i18n.CLOSE}
            </EuiButton>
          </EuiFlexItem>
        </EuiModalFooter>
      </div>
    </EuiModal>
  );
};

export const FieldsBrowser = React.memo(FieldsBrowserComponent);
