/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFocusTrap,
  EuiFlexItem,
  EuiOutsideClickDetector,
  EuiScreenReaderOnly,
  EuiToolTip,
} from '@elastic/eui';
import React, { useEffect, useCallback, useRef } from 'react';
import { noop } from 'lodash/fp';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';

import {
  isEscape,
  isTab,
  stopPropagationAndPreventDefault,
} from '../../../common/components/accessibility/helpers';
import { BrowserFields } from '../../../common/containers/source';
import { ColumnHeaderOptions } from '../../../timelines/store/timeline/model';
import { CategoriesPane } from './categories_pane';
import { FieldsPane } from './fields_pane';
import { Header } from './header';
import {
  CATEGORY_PANE_WIDTH,
  CLOSE_BUTTON_CLASS_NAME,
  FIELDS_PANE_WIDTH,
  focusSearchInput,
  onFieldsBrowserTabPressed,
  PANES_FLEX_GROUP_WIDTH,
  scrollCategoriesPane,
} from './helpers';
import { FieldBrowserProps, OnHideFieldBrowser } from './types';
import { timelineActions } from '../../store/timeline';

import * as i18n from './translations';

const FieldsBrowserContainer = styled.div<{ width: number }>`
  background-color: ${({ theme }) => theme.eui.euiColorLightestShade};
  border: ${({ theme }) => theme.eui.euiBorderWidthThin} solid
    ${({ theme }) => theme.eui.euiColorMediumShade};
  border-radius: ${({ theme }) => theme.eui.euiBorderRadius};
  left: 8px;
  padding: ${({ theme }) => theme.eui.paddingSizes.s} ${({ theme }) => theme.eui.paddingSizes.s}
    ${({ theme }) => theme.eui.paddingSizes.s};
  position: absolute;
  top: calc(100% + 4px);
  width: ${({ width }) => width}px;
  z-index: 9990;
`;
FieldsBrowserContainer.displayName = 'FieldsBrowserContainer';

const PanesFlexGroup = styled(EuiFlexGroup)`
  width: ${PANES_FLEX_GROUP_WIDTH}px;
`;
PanesFlexGroup.displayName = 'PanesFlexGroup';

type Props = Pick<
  FieldBrowserProps,
  'browserFields' | 'height' | 'onFieldSelected' | 'timelineId' | 'width'
> & {
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
  onHideFieldBrowser: OnHideFieldBrowser;
  /**
   * Invoked when the user clicks outside of the field browser
   */
  onOutsideClick: () => void;
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
  browserFields,
  columnHeaders,
  filteredBrowserFields,
  isSearching,
  onCategorySelected,
  onFieldSelected,
  onHideFieldBrowser,
  onSearchInputChange,
  onOutsideClick,
  restoreFocusTo,
  searchInput,
  selectedCategoryId,
  timelineId,
  width,
}) => {
  const dispatch = useDispatch();
  const containerElement = useRef<HTMLDivElement | null>(null);

  const onUpdateColumns = useCallback(
    (columns) => dispatch(timelineActions.updateColumns({ id: timelineId, columns })),
    [dispatch, timelineId]
  );

  /** Invoked when the user types in the input to filter the field browser */
  const onInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onSearchInputChange(event.target.value);
    },
    [onSearchInputChange]
  );

  const selectFieldAndHide = useCallback(
    (fieldId: string) => {
      if (onFieldSelected != null) {
        onFieldSelected(fieldId);
      }

      onHideFieldBrowser();
    },
    [onFieldSelected, onHideFieldBrowser]
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

  const closeAndRestoreFocus = useCallback(() => {
    onOutsideClick();
    setTimeout(() => {
      // restore focus on the next tick after we have escaped the EuiFocusTrap
      restoreFocusTo.current?.focus();
    }, 0);
  }, [onOutsideClick, restoreFocusTo]);

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
    <EuiOutsideClickDetector
      data-test-subj="outside-click-detector"
      onOutsideClick={onFieldSelected != null ? noop : onOutsideClick}
      isDisabled={false}
    >
      <FieldsBrowserContainer
        data-test-subj="fields-browser-container"
        onKeyDown={onKeyDown}
        ref={containerElement}
        width={width}
      >
        <EuiFocusTrap>
          <EuiScreenReaderOnly data-test-subj="screenReaderOnly">
            <p>{i18n.YOU_ARE_IN_A_POPOVER}</p>
          </EuiScreenReaderOnly>

          <EuiFlexGroup gutterSize="none" justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiToolTip position="top" content={i18n.CLOSE} data-test-subj="closeToolTip">
                <EuiButtonIcon
                  aria-label={i18n.CLOSE}
                  className={CLOSE_BUTTON_CLASS_NAME}
                  data-test-subj="close"
                  iconType="cross"
                  onClick={closeAndRestoreFocus}
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>

          <Header
            data-test-subj="header"
            filteredBrowserFields={filteredBrowserFields}
            isSearching={isSearching}
            onOutsideClick={closeAndRestoreFocus}
            onSearchInputChange={onInputChange}
            onUpdateColumns={onUpdateColumns}
            searchInput={searchInput}
            timelineId={timelineId}
          />

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
                onFieldSelected={selectFieldAndHide}
                onUpdateColumns={onUpdateColumns}
                searchInput={searchInput}
                selectedCategoryId={selectedCategoryId}
                timelineId={timelineId}
                width={FIELDS_PANE_WIDTH}
              />
            </EuiFlexItem>
          </PanesFlexGroup>
        </EuiFocusTrap>
      </FieldsBrowserContainer>
    </EuiOutsideClickDetector>
  );
};

export const FieldsBrowser = React.memo(FieldsBrowserComponent);
