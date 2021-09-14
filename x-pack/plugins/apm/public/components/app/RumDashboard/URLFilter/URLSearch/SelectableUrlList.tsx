/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  FormEvent,
  SetStateAction,
  useRef,
  useState,
  KeyboardEvent,
  useEffect,
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
  EuiText,
  EuiIcon,
  EuiBadge,
  EuiButtonIcon,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import useEvent from 'react-use/lib/useEvent';
import {
  formatOptions,
  selectableRenderOptions,
  UrlOption,
} from './RenderOption';
import { I18LABELS } from '../../translations';
import { useUiSetting$ } from '../../../../../../../../../src/plugins/kibana_react/public';

const StyledRow = styled.div<{
  darkMode: boolean;
}>`
  text-align: center;
  padding: 8px 0px;
  background-color: ${(props) =>
    props.darkMode
      ? euiDarkVars.euiPageBackgroundColor
      : euiLightVars.euiPageBackgroundColor};
  border-bottom: 1px solid
    ${(props) =>
      props.darkMode
        ? euiDarkVars.euiColorLightestShade
        : euiLightVars.euiColorLightestShade};
`;

interface Props {
  data: {
    items: UrlOption[];
    total?: number;
  };
  loading: boolean;
  onInputChange: (e: FormEvent<HTMLInputElement>) => void;
  onTermChange: () => void;
  onApply: () => void;
  onChange: (updatedOptions: UrlOption[]) => void;
  searchValue: string;
  popoverIsOpen: boolean;
  initialValue?: string;
  setPopoverIsOpen: React.Dispatch<SetStateAction<boolean>>;
}

export function SelectableUrlList({
  data,
  loading,
  onInputChange,
  onTermChange,
  onChange,
  onApply,
  searchValue,
  popoverIsOpen,
  setPopoverIsOpen,
  initialValue,
}: Props) {
  const [darkMode] = useUiSetting$<boolean>('theme:darkMode');

  const [searchRef, setSearchRef] = useState<HTMLInputElement | null>(null);

  const titleRef = useRef<HTMLDivElement>(null);

  const formattedOptions = formatOptions(data.items ?? []);

  const onEnterKey = (evt: KeyboardEvent<HTMLInputElement>) => {
    if (evt.key.toLowerCase() === 'enter') {
      onTermChange();
      onApply();
      setPopoverIsOpen(false);
    }
  };

  const onInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
    setPopoverIsOpen(true);
    if (searchRef) {
      searchRef.focus();
    }
  };

  const onSearchInput = (e: React.FormEvent<HTMLInputElement>) => {
    onInputChange(e);
    setPopoverIsOpen(true);
  };

  const closePopover = () => {
    setPopoverIsOpen(false);
  };

  // @ts-ignore - not sure, why it's not working
  useEvent('keydown', onEnterKey, searchRef);
  useEvent('escape', () => setPopoverIsOpen(false), searchRef);

  useEffect(() => {
    if (searchRef && initialValue) {
      searchRef.value = initialValue;
    }

    // only want to call it at initial render to set value
    // coming from initial value/url
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchRef]);

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
              aria-label={i18n.translate('xpack.apm.csm.search.url.close', {
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
      onChange={onChange}
      isLoading={loading}
      options={formattedOptions}
      renderOption={selectableRenderOptions}
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
        rowHeight: 68,
        showIcons: true,
        onFocusBadge: false,
      }}
      loadingMessage={loadingMessage}
      emptyMessage={emptyMessage}
      noMatchesMessage={emptyMessage}
      allowExclusions={true}
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
            {searchValue && (
              <StyledRow darkMode={darkMode}>
                <EuiText size="s">
                  <FormattedMessage
                    id="xpack.apm.ux.url.hitEnter.include"
                    defaultMessage="Hit {icon} or click apply to include all urls matching {searchValue}"
                    values={{
                      searchValue: <strong>{searchValue}</strong>,
                      icon: (
                        <EuiBadge color="hollow">
                          Enter <EuiIcon type="returnKey" />
                        </EuiBadge>
                      ),
                    }}
                  />
                </EuiText>
              </StyledRow>
            )}
            {list}
            <EuiPopoverFooter paddingSize="s">
              <EuiFlexGroup style={{ justifyContent: 'flex-end' }}>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    size="s"
                    onClick={() => {
                      onTermChange();
                      onApply();
                      closePopover();
                    }}
                  >
                    {i18n.translate('xpack.apm.apply.label', {
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
