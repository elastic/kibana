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
import React, { useEffect, useCallback, useRef, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';

import type { BrowserFields } from '../../../../../common/search_strategy';
import type { ColumnHeaderOptions, CreateFieldComponentType } from '../../../../../common/types';
import {
  isEscape,
  isTab,
  stopPropagationAndPreventDefault,
} from '../../../../../common/utils/accessibility';
import { CategoriesPane } from './categories_pane';
import { FieldsPane } from './fields_pane';
import { Search } from './search';

import {
  CATEGORY_PANE_WIDTH,
  CLOSE_BUTTON_CLASS_NAME,
  FIELDS_PANE_WIDTH,
  FIELD_BROWSER_WIDTH,
  filterBrowserFieldsByFieldName,
  focusSearchInput,
  mergeBrowserFieldsWithDefaultCategory,
  onFieldsBrowserTabPressed,
  PANES_FLEX_GROUP_WIDTH,
  RESET_FIELDS_CLASS_NAME,
  scrollCategoriesPane,
} from './helpers';
import type { FieldBrowserProps } from './types';
import { tGridActions, tGridSelectors } from '../../../../store/t_grid';

import * as i18n from './translations';
import { useDeepEqualSelector } from '../../../../hooks/use_selector';
import { DEFAULT_CATEGORY_NAME } from '../../body/column_headers/default_headers';
import { INPUT_TIMEOUT } from '.';

const PanesFlexGroup = styled(EuiFlexGroup)`
  width: ${PANES_FLEX_GROUP_WIDTH}px;
`;
PanesFlexGroup.displayName = 'PanesFlexGroup';

type Props = Pick<FieldBrowserProps, 'timelineId' | 'browserFields' | 'width'> & {
  /**
   * The current timeline column headers
   */
  browserFields: BrowserFields;

  columnHeaders: ColumnHeaderOptions[];

  createFieldComponent?: CreateFieldComponentType;
  /**
   * Hides the field browser when invoked
   */
  setShow: (isShowing: boolean) => void;

  show: boolean;

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
  browserFields,
  columnHeaders,
  createFieldComponent: CreateField,
  restoreFocusTo,
  setShow,
  show,
  timelineId,
  width = FIELD_BROWSER_WIDTH,
}) => {
  /** tracks the latest timeout id from `setTimeout`*/
  const inputTimeoutId = useRef(0);

  const dispatch = useDispatch();

  const containerElement = useRef<HTMLDivElement | null>(null);

  /** all field names shown in the field browser must contain this string (when specified) */
  const [filterInput, setFilterInput] = useState('');

  const [appliedFilterInput, setAppliedFilterInput] = useState('');
  /** all fields in this collection have field names that match the filterInput */
  const [filteredBrowserFields, setFilteredBrowserFields] = useState<BrowserFields | null>(null);
  /** when true, show a spinner in the input to indicate the field browser is searching for matching field names */
  const [isSearching, setIsSearching] = useState(false);
  /** this category will be displayed in the right-hand pane of the field browser */
  const [selectedCategoryId, setSelectedCategoryId] = useState(DEFAULT_CATEGORY_NAME);

  const onUpdateColumns = useCallback(
    (columns) => dispatch(tGridActions.updateColumns({ id: timelineId, columns })),
    [dispatch, timelineId]
  );

  const newFilteredBrowserFields = useMemo(() => {
    return filterBrowserFieldsByFieldName({
      browserFields: mergeBrowserFieldsWithDefaultCategory(browserFields),
      substring: appliedFilterInput,
    });
  }, [appliedFilterInput, browserFields]);

  const newSelectedCategoryId = useMemo(() => {
    if (appliedFilterInput === '' || Object.keys(newFilteredBrowserFields).length === 0) {
      return DEFAULT_CATEGORY_NAME;
    } else {
      return Object.keys(newFilteredBrowserFields)
        .sort()
        .reduce<string>((selected, category) => {
          const filteredBrowserFieldsByCategory =
            (newFilteredBrowserFields[category] && newFilteredBrowserFields[category].fields) || [];
          const filteredBrowserFieldsBySelected =
            (newFilteredBrowserFields[selected] && newFilteredBrowserFields[selected].fields) || [];
          return newFilteredBrowserFields[category].fields != null &&
            newFilteredBrowserFields[selected].fields != null &&
            Object.keys(filteredBrowserFieldsByCategory).length >
              Object.keys(filteredBrowserFieldsBySelected).length
            ? category
            : selected;
        }, Object.keys(newFilteredBrowserFields)[0]);
    }
  }, [appliedFilterInput, newFilteredBrowserFields]);

  /** Invoked when the user types in the filter input */
  const onSearchInputChange = useCallback((newFilterInput: string) => {
    setFilterInput(newFilterInput);
    setIsSearching(true);
  }, []);

  useEffect(() => {
    if (inputTimeoutId.current !== 0) {
      clearTimeout(inputTimeoutId.current); // ⚠️ mutation: cancel any previous timers
    }
    // ⚠️ mutation: schedule a new timer that will apply the filter when it fires:
    inputTimeoutId.current = window.setTimeout(() => {
      setIsSearching(false);
      setAppliedFilterInput(filterInput);
    }, INPUT_TIMEOUT);
    return () => {
      clearTimeout(inputTimeoutId.current);
    };
  }, [filterInput]);

  useEffect(() => {
    setFilteredBrowserFields(newFilteredBrowserFields);
  }, [newFilteredBrowserFields]);

  useEffect(() => {
    setSelectedCategoryId(newSelectedCategoryId);
  }, [newSelectedCategoryId]);

  /** Invoked when the field browser should be hidden */
  const onHide = useCallback(() => {
    setFilterInput('');
    setAppliedFilterInput('');
    setFilteredBrowserFields(null);
    setIsSearching(false);
    setSelectedCategoryId(DEFAULT_CATEGORY_NAME);
    setShow(false);
  }, [setShow]);

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

  // only merge in the default category if the field browser is visible
  const browserFieldsWithDefaultCategory = useMemo(() => {
    return show ? mergeBrowserFieldsWithDefaultCategory(browserFields) : {};
  }, [show, browserFields]);

  const activeFilteredBrowserFields =
    filteredBrowserFields != null ? filteredBrowserFields : browserFieldsWithDefaultCategory;
  return (
    <EuiModal onClose={closeAndRestoreFocus} style={{ width, maxWidth: width }}>
      <div data-test-subj="fields-browser-container" onKeyDown={onKeyDown} ref={containerElement}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <h1>{i18n.FIELDS_BROWSER}</h1>
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <EuiFlexGroup gutterSize="none">
            <EuiFlexItem>
              <Search
                data-test-subj="header"
                filteredBrowserFields={activeFilteredBrowserFields}
                isSearching={isSearching}
                onSearchInputChange={onInputChange}
                searchInput={filterInput}
                timelineId={timelineId}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {CreateField && dataViewId != null && dataViewId.length > 0 && (
                <CreateField onClick={onHide} />
              )}
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="l" />
          <PanesFlexGroup alignItems="flexStart" gutterSize="none" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <CategoriesPane
                data-test-subj="left-categories-pane"
                filteredBrowserFields={activeFilteredBrowserFields}
                width={CATEGORY_PANE_WIDTH}
                onCategorySelected={setSelectedCategoryId}
                selectedCategoryId={selectedCategoryId}
                timelineId={timelineId}
              />
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <FieldsPane
                columnHeaders={columnHeaders}
                data-test-subj="fields-pane"
                filteredBrowserFields={activeFilteredBrowserFields}
                onCategorySelected={setSelectedCategoryId}
                onUpdateColumns={onUpdateColumns}
                searchInput={appliedFilterInput}
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
