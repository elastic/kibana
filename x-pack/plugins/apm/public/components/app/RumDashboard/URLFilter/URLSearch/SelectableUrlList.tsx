/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FormEvent, useRef, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  EuiSelectableMessage,
} from '@elastic/eui';
import {
  formatOptions,
  selectableRenderOptions,
  UrlOption,
} from './RenderOption';
import { I18LABELS } from '../../translations';

interface Props {
  data: {
    items: UrlOption[];
    total?: number;
  };
  loading: boolean;
  onInputChange: (e: FormEvent<HTMLInputElement>) => void;
  onTermChange: () => void;
  onChange: (updatedOptions: UrlOption[]) => void;
  searchValue: string;
  onClose: () => void;
}

export function SelectableUrlList({
  data,
  loading,
  onInputChange,
  onTermChange,
  onChange,
  searchValue,
  onClose,
}: Props) {
  const [popoverIsOpen, setPopoverIsOpen] = useState(false);
  const [popoverRef, setPopoverRef] = useState<HTMLElement | null>(null);
  const [searchRef, setSearchRef] = useState<HTMLInputElement | null>(null);

  const titleRef = useRef<HTMLDivElement>(null);

  const searchOnFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setPopoverIsOpen(true);
  };

  const onSearchInput = (e: React.FormEvent<HTMLInputElement>) => {
    onInputChange(e);
    setPopoverIsOpen(true);
  };

  const searchOnBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (
      !popoverRef?.contains(e.relatedTarget as HTMLElement) &&
      !popoverRef?.contains(titleRef.current as HTMLDivElement)
    ) {
      setPopoverIsOpen(false);
    }
  };

  const formattedOptions = formatOptions(data.items ?? []);

  const closePopover = () => {
    setPopoverIsOpen(false);
    onClose();
    if (searchRef) {
      searchRef.blur();
    }
  };

  const loadingMessage = (
    <EuiSelectableMessage style={{ minHeight: 300 }}>
      <EuiLoadingSpinner size="l" />
      <br />
      <p>{I18LABELS.loadingResults}</p>
    </EuiSelectableMessage>
  );

  const emptyMessage = (
    <EuiSelectableMessage style={{ minHeight: 300 }}>
      <p>{I18LABELS.noResults}</p>
    </EuiSelectableMessage>
  );

  const titleText = searchValue
    ? I18LABELS.getSearchResultsLabel(data?.total ?? 0)
    : I18LABELS.topPages;

  function PopOverTitle() {
    return (
      <EuiPopoverTitle>
        <EuiFlexGroup ref={titleRef}>
          <EuiFlexItem style={{ justifyContent: 'center' }}>
            {loading ? <EuiLoadingSpinner /> : titleText}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              disabled={!searchValue}
              onClick={() => {
                onTermChange();
                setPopoverIsOpen(false);
              }}
            >
              {I18LABELS.matchThisQuery}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverTitle>
    );
  }

  return (
    <EuiSelectable
      searchable
      onChange={onChange}
      isLoading={loading}
      options={formattedOptions}
      renderOption={selectableRenderOptions}
      singleSelection={false}
      searchProps={{
        placeholder: I18LABELS.searchByUrl,
        isClearable: true,
        onFocus: searchOnFocus,
        onBlur: searchOnBlur,
        onInput: onSearchInput,
        inputRef: setSearchRef,
      }}
      listProps={{
        rowHeight: 68,
        showIcons: true,
      }}
      loadingMessage={loadingMessage}
      emptyMessage={emptyMessage}
      noMatchesMessage={emptyMessage}
    >
      {(list, search) => (
        <EuiPopover
          panelPaddingSize="none"
          isOpen={popoverIsOpen}
          display={'block'}
          panelRef={setPopoverRef}
          button={search}
          closePopover={closePopover}
        >
          <div style={{ width: 600, maxWidth: '100%' }}>
            <PopOverTitle />
            {list}
          </div>
        </EuiPopover>
      )}
    </EuiSelectable>
  );
}
