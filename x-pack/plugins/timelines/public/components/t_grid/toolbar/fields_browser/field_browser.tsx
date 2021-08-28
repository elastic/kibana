/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
} from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';
import type { BrowserFields } from '../../../../../common/search_strategy/index_fields';
import type { ColumnHeaderOptions } from '../../../../../common/types/timeline/columns';
import {
  isEscape,
  isTab,
  stopPropagationAndPreventDefault,
} from '../../../../../common/utils/accessibility/helpers';
import { useDeepEqualSelector } from '../../../../hooks/use_selector';
import * as tGridActions from '../../../../store/t_grid/actions';
import * as tGridSelectors from '../../../../store/t_grid/selectors';
import { CategoriesPane } from './categories_pane';
import { FieldsPane } from './fields_pane';
import {
  CATEGORY_PANE_WIDTH,
  CLOSE_BUTTON_CLASS_NAME,
  FIELDS_PANE_WIDTH,
  FIELD_BROWSER_WIDTH,
  focusSearchInput,
  onFieldsBrowserTabPressed,
  PANES_FLEX_GROUP_WIDTH,
  RESET_FIELDS_CLASS_NAME,
  scrollCategoriesPane,
} from './helpers';
import { Search } from './search';
import * as i18n from './translations';
import type { FieldBrowserProps } from './types';

const PanesFlexGroup = styled(EuiFlexGroup)`
  width: ${PANES_FLEX_GROUP_WIDTH}px;
`;
PanesFlexGroup.displayName = 'PanesFlexGroup';

type Props = Pick<FieldBrowserProps, 'timelineId' | 'browserFields' | 'width'> & {
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
  /**
   * The category selected on the left-hand side of the field browser
   */
  selectedCategoryId: string;
  /**
   * Invoked when the user clicks on the name of a category in the left-hand
   * side of the field browser
   */
  onCategorySelected: (categoryId: string) => void;
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
  onCategorySelected,
  onSearchInputChange,
  onHide,
  restoreFocusTo,
  searchInput,
  selectedCategoryId,
  timelineId,
  width = FIELD_BROWSER_WIDTH,
}) => {
  const dispatch = useDispatch();
  const containerElement = useRef<HTMLDivElement | null>(null);

  const onUpdateColumns = useCallback(
    (columns) => dispatch(tGridActions.updateColumns({ id: timelineId, columns })),
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
  const { defaultColumns } = useDeepEqualSelector((state) => getManageTimeline(state, timelineId));

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

  const scrollViewsAndFocusInput = useCallback(() => {
    scrollCategoriesPane({
      containerElement: containerElement.current,
      selectedCategoryId,
      timelineId,
    });

    // always re-focus the input to enable additional filtering
    focusSearchInput({
      containerElement: containerElement.current,
      timelineId,
    });
  }, [selectedCategoryId, timelineId]);

  useEffect(() => {
    scrollViewsAndFocusInput();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoryId, timelineId]);

  const onKeyDown = useCallback(
    (keyboardEvent: React.KeyboardEvent) => {
      if (isEscape(keyboardEvent)) {
        stopPropagationAndPreventDefault(keyboardEvent);
        closeAndRestoreFocus();
      } else if (isTab(keyboardEvent)) {
        onFieldsBrowserTabPressed({
          containerElement: containerElement.current,
          keyboardEvent,
          selectedCategoryId,
          timelineId,
        });
      }
    },
    [closeAndRestoreFocus, containerElement, selectedCategoryId, timelineId]
  );

  return (
    <EuiModal onClose={closeAndRestoreFocus} style={{ width, maxWidth: width }}>
      <div data-test-subj="fields-browser-container" onKeyDown={onKeyDown} ref={containerElement}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <h1>{i18n.FIELDS_BROWSER}</h1>
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <Search
            data-test-subj="header"
            filteredBrowserFields={filteredBrowserFields}
            isSearching={isSearching}
            onSearchInputChange={onInputChange}
            searchInput={searchInput}
            timelineId={timelineId}
          />
          <EuiSpacer size="l" />
          <PanesFlexGroup alignItems="flexStart" gutterSize="none" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <CategoriesPane
                data-test-subj="left-categories-pane"
                filteredBrowserFields={filteredBrowserFields}
                width={CATEGORY_PANE_WIDTH}
                onCategorySelected={onCategorySelected}
                selectedCategoryId={selectedCategoryId}
                timelineId={timelineId}
              />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <FieldsPane
                columnHeaders={columnHeaders}
                data-test-subj="fields-pane"
                filteredBrowserFields={filteredBrowserFields}
                onCategorySelected={onCategorySelected}
                onUpdateColumns={onUpdateColumns}
                searchInput={searchInput}
                selectedCategoryId={selectedCategoryId}
                timelineId={timelineId}
                width={FIELDS_PANE_WIDTH}
              />
            </EuiFlexItem>
          </PanesFlexGroup>
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
