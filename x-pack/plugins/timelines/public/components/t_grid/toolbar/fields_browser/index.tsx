/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiToolTip } from '@elastic/eui';
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import styled from 'styled-components';

import type { BrowserFields } from '../../../../../common/search_strategy/index_fields';
import { DEFAULT_CATEGORY_NAME } from '../../body/column_headers/default_headers';
import { FieldsBrowser } from './field_browser';
import { filterBrowserFieldsByFieldName, mergeBrowserFieldsWithDefaultCategory } from './helpers';
import * as i18n from './translations';
import type { FieldBrowserProps } from './types';

const FIELDS_BUTTON_CLASS_NAME = 'fields-button';

/** wait this many ms after the user completes typing before applying the filter input */
export const INPUT_TIMEOUT = 250;

const FieldsBrowserButtonContainer = styled.div`
  display: inline-block;
  position: relative;
`;

FieldsBrowserButtonContainer.displayName = 'FieldsBrowserButtonContainer';
/**
 * Manages the state of the field browser
 */
export const StatefulFieldsBrowserComponent: React.FC<FieldBrowserProps> = ({
  timelineId,
  columnHeaders,
  browserFields,
  createFieldComponent,
  width,
}) => {
  const customizeColumnsButtonRef = useRef<HTMLButtonElement | null>(null);
  /** tracks the latest timeout id from `setTimeout`*/
  const inputTimeoutId = useRef(0);

  /** all field names shown in the field browser must contain this string (when specified) */
  const [filterInput, setFilterInput] = useState('');

  const [appliedFilterInput, setAppliedFilterInput] = useState('');
  /** all fields in this collection have field names that match the filterInput */
  const [filteredBrowserFields, setFilteredBrowserFields] = useState<BrowserFields | null>(null);
  /** when true, show a spinner in the input to indicate the field browser is searching for matching field names */
  const [isSearching, setIsSearching] = useState(false);
  /** this category will be displayed in the right-hand pane of the field browser */
  const [selectedCategoryId, setSelectedCategoryId] = useState(DEFAULT_CATEGORY_NAME);
  /** show the field browser */
  const [show, setShow] = useState(false);

  /** Shows / hides the field browser */
  const onShow = useCallback(() => {
    setShow(true);
  }, []);

  /** Invoked when the field browser should be hidden */
  const onHide = useCallback(() => {
    setFilterInput('');
    setAppliedFilterInput('');
    setFilteredBrowserFields(null);
    setIsSearching(false);
    setSelectedCategoryId(DEFAULT_CATEGORY_NAME);
    setShow(false);
  }, []);

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
  const updateFilter = useCallback((newFilterInput: string) => {
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

  // only merge in the default category if the field browser is visible
  const browserFieldsWithDefaultCategory = useMemo(() => {
    return show ? mergeBrowserFieldsWithDefaultCategory(browserFields) : {};
  }, [show, browserFields]);

  return (
    <FieldsBrowserButtonContainer data-test-subj="fields-browser-button-container">
      <EuiToolTip content={i18n.FIELDS_BROWSER}>
        <EuiButtonEmpty
          aria-label={i18n.FIELDS_BROWSER}
          buttonRef={customizeColumnsButtonRef}
          className={FIELDS_BUTTON_CLASS_NAME}
          color="text"
          data-test-subj="show-field-browser"
          iconType="tableOfContents"
          onClick={onShow}
          size="xs"
        >
          {i18n.FIELDS}
        </EuiButtonEmpty>
      </EuiToolTip>

      {show && (
        <FieldsBrowser
          browserFields={browserFieldsWithDefaultCategory}
          createFieldComponent={createFieldComponent}
          columnHeaders={columnHeaders}
          filteredBrowserFields={
            filteredBrowserFields != null ? filteredBrowserFields : browserFieldsWithDefaultCategory
          }
          isSearching={isSearching}
          onCategorySelected={setSelectedCategoryId}
          onHide={onHide}
          onSearchInputChange={updateFilter}
          restoreFocusTo={customizeColumnsButtonRef}
          searchInput={filterInput}
          appliedFilterInput={appliedFilterInput}
          selectedCategoryId={selectedCategoryId}
          timelineId={timelineId}
          width={width}
        />
      )}
    </FieldsBrowserButtonContainer>
  );
};

export const StatefulFieldsBrowser = React.memo(StatefulFieldsBrowserComponent);
