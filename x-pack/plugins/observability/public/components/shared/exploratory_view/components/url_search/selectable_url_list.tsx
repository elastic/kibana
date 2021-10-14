/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  SetStateAction,
  useRef,
  useState,
  KeyboardEvent,
  useEffect,
  ReactNode,
  FormEventHandler,
} from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  EuiSelectableMessage,
  EuiPopoverFooter,
  EuiButton,
  EuiButtonIcon,
  EuiSelectableOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import useEvent from 'react-use/lib/useEvent';
import classNames from 'classnames';
import { I18LABELS } from './translations';

export type UrlOption<T = { [key: string]: any }> = {
  meta?: string[];
  isNewWildcard?: boolean;
  isWildcard?: boolean;
  title: string;
} & EuiSelectableOption<T>;

export interface SelectableUrlListProps {
  data: {
    items: UrlOption[];
    total?: number;
  };
  loading: boolean;
  rowHeight?: number;
  onInputChange: (val: string) => void;
  onSelectionApply: () => void;
  onSelectionChange: (updatedOptions: UrlOption[]) => void;
  searchValue: string;
  popoverIsOpen: boolean;
  initialValue?: string;
  setPopoverIsOpen: React.Dispatch<SetStateAction<boolean>>;
  renderOption?: (option: UrlOption, searchValue: string) => ReactNode;
  hasChanged: () => boolean;
}
export const formatOptions = (options: EuiSelectableOption[]) => {
  return options.map((item: EuiSelectableOption) => ({
    title: item.label,
    ...item,
    className: classNames('euiSelectableTemplateSitewide__listItem', item.className),
  }));
};
export function SelectableUrlList({
  data,
  loading,
  onInputChange,
  onSelectionChange,
  onSelectionApply,
  searchValue,
  popoverIsOpen,
  setPopoverIsOpen,
  initialValue,
  renderOption,
  rowHeight,
  hasChanged,
}: SelectableUrlListProps) {
  const [searchRef, setSearchRef] = useState<HTMLInputElement | null>(null);

  const titleRef = useRef<HTMLDivElement>(null);

  const formattedOptions = formatOptions(data.items ?? []);

  const onEnterKey = (evt: KeyboardEvent<HTMLInputElement>) => {
    if (evt.key.toLowerCase() === 'enter') {
      onSelectionApply();
      setPopoverIsOpen(false);
    }
  };

  const onInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
    setPopoverIsOpen(true);
    if (searchRef) {
      searchRef.focus();
    }
  };

  const onSearchInput: FormEventHandler<HTMLInputElement> = (e) => {
    onInputChange((e.target as HTMLInputElement).value);
    setPopoverIsOpen(true);
  };

  const closePopover = () => {
    setPopoverIsOpen(false);
  };

  // @ts-ignore - not sure, why it's not working
  useEvent('keydown', onEnterKey, searchRef);
  useEvent('escape', () => setPopoverIsOpen(false), searchRef);

  useEffect(() => {
    if (searchRef && searchRef.value !== searchValue) {
      searchRef.value = searchValue;
      searchRef.dispatchEvent(new Event('change'));
    }
  }, [searchRef, searchValue]);

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
      <EuiPopoverTitle paddingSize="s">
        <EuiFlexGroup ref={titleRef} gutterSize="xs">
          <EuiFlexItem style={{ justifyContent: 'center' }}>
            {loading ? <EuiLoadingSpinner /> : titleText}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              color="text"
              onClick={() => closePopover()}
              aria-label={i18n.translate('xpack.observability.search.url.close', {
                defaultMessage: 'Close',
              })}
              iconType={'cross'}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverTitle>
    );
  }

  return (
    <EuiSelectable
      searchable
      onChange={onSelectionChange}
      options={searchValue !== searchRef?.value ? [] : formattedOptions}
      renderOption={renderOption}
      singleSelection={false}
      searchProps={{
        isClearable: true,
        onClick: onInputClick,
        onInput: onSearchInput,
        inputRef: setSearchRef,
        placeholder: I18LABELS.filterByUrl,
        'aria-label': I18LABELS.filterByUrl,
      }}
      listProps={{
        rowHeight,
        showIcons: true,
        onFocusBadge: false,
      }}
      loadingMessage={loadingMessage}
      emptyMessage={emptyMessage}
      noMatchesMessage={emptyMessage}
      allowExclusions={true}
      isPreFiltered={searchValue !== searchRef?.value}
    >
      {(list, search) => (
        <EuiPopover
          panelPaddingSize="none"
          isOpen={popoverIsOpen}
          display={'block'}
          button={search}
          closePopover={closePopover}
          style={{ minWidth: 400 }}
          anchorPosition="downLeft"
          ownFocus={false}
        >
          <div
            style={{
              width: searchRef?.getBoundingClientRect().width ?? 600,
              maxWidth: '100%',
            }}
          >
            <PopOverTitle />
            {list}
            <EuiPopoverFooter paddingSize="s">
              <EuiFlexGroup style={{ justifyContent: 'flex-end' }}>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    size="s"
                    onClick={() => {
                      onSelectionApply();
                      closePopover();
                    }}
                    isDisabled={!hasChanged()}
                  >
                    {i18n.translate('xpack.observability.apply.label', {
                      defaultMessage: 'Apply',
                    })}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPopoverFooter>
          </div>
        </EuiPopover>
      )}
    </EuiSelectable>
  );
}

// eslint-disable-next-line import/no-default-export
export default SelectableUrlList;
