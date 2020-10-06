/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, {
  FormEvent,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiInputPopover,
  EuiPopoverTitle,
  EuiSelectable,
  EuiSelectableMessage,
  EuiPopoverFooter,
  EuiButton,
  EuiText,
  EuiIcon,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import {
  formatOptions,
  selectableRenderOptions,
  UrlOption,
} from './RenderOption';
import { I18LABELS } from '../../translations';

const StyledRow = styled.div`
  text-align: center;
  padding-top: 8px;
`;

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
  popoverIsOpen: boolean;
  setPopoverIsOpen: React.Dispatch<SetStateAction<boolean>>;
}

export function SelectableUrlList({
  data,
  loading,
  onInputChange,
  onTermChange,
  onChange,
  searchValue,
  onClose,
  popoverIsOpen,
  setPopoverIsOpen,
}: Props) {
  const [popoverRef, setPopoverRef] = useState<HTMLElement | null>(null);
  const [searchRef, setSearchRef] = useState<HTMLInputElement | null>(null);

  const titleRef = useRef<HTMLDivElement>(null);

  const onEnterKey = (e) => {
    if (e.key.toLowerCase() === 'enter') {
      onTermChange();
      setPopoverIsOpen(false);
    }
  };

  useEffect(() => {
    searchRef?.addEventListener('keydown', onEnterKey);
    return () => {
      searchRef?.removeEventListener('keydown', onEnterKey);
    };
  });

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
        onFocusBadge: false,
      }}
      loadingMessage={loadingMessage}
      emptyMessage={emptyMessage}
      noMatchesMessage={emptyMessage}
    >
      {(list, search) => (
        <EuiInputPopover
          fullWidth
          panelPaddingSize="none"
          isOpen={popoverIsOpen}
          display={'block'}
          panelRef={setPopoverRef}
          input={search}
          closePopover={closePopover}
          anchorPosition={'downLeft'}
        >
          <div style={{ width: 600, maxWidth: '100%' }}>
            <PopOverTitle />
            <StyledRow>
              <EuiText size="s">
                <FormattedMessage
                  id="euiComboBoxOptionsList.createCustomOption"
                  defaultMessage="Hit Enter {icon} to include all urls matching {searchValue}"
                  values={{
                    searchValue: <strong>{searchValue}</strong>,
                    icon: (
                      <EuiIcon size="s" type="returnKey">
                        {searchValue}
                      </EuiIcon>
                    ),
                  }}
                />
              </EuiText>
            </StyledRow>
            {list}
            <EuiPopoverFooter>
              <EuiFlexGroup style={{ justifyContent: 'flex-end' }}>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    size="s"
                    onClick={() => {
                      onTermChange();
                      closePopover();
                    }}
                  >
                    {i18n.translate('xpack.apm.applyOptions', {
                      defaultMessage: 'Apply options',
                    })}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPopoverFooter>
          </div>
        </EuiInputPopover>
      )}
    </EuiSelectable>
  );
}
