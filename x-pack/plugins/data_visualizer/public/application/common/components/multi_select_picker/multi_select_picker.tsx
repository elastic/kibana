/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFilterSelectItem,
  EuiIcon,
  EuiPopover,
  EuiPopoverTitle,
  EuiSpacer,
} from '@elastic/eui';
import React, { FC, ReactNode, useEffect, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { euiDarkVars as euiThemeDark, euiLightVars as euiThemeLight } from '@kbn/ui-theme';
import { useDataVisualizerKibana } from '../../../kibana_context';

export interface Option {
  name?: string | ReactNode;
  value: string;
  checked?: 'on' | 'off';
  disabled?: boolean;
}

const NoFilterItems = () => {
  return (
    <div className="euiFilterSelect__note">
      <div className="euiFilterSelect__noteContent">
        <EuiIcon type="minusInCircle" />
        <EuiSpacer size="xs" />
        <p>
          <FormattedMessage
            id="xpack.dataVisualizer.multiSelectPicker.NoFiltersFoundMessage"
            defaultMessage="No filters found"
          />
        </p>
      </div>
    </div>
  );
};

export function useCurrentEuiTheme() {
  const { services } = useDataVisualizerKibana();
  const uiSettings = services.uiSettings;
  return useMemo(
    () => (uiSettings.get('theme:darkMode') ? euiThemeDark : euiThemeLight),
    [uiSettings]
  );
}

export const MultiSelectPicker: FC<{
  options: Option[];
  onChange?: (items: string[]) => void;
  title?: string;
  checkedOptions: string[];
  dataTestSubj: string;
}> = ({ options, onChange, title, checkedOptions, dataTestSubj }) => {
  const euiTheme = useCurrentEuiTheme();

  const [items, setItems] = useState<Option[]>(options);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    if (searchTerm === '') {
      setItems(options);
    } else {
      const filteredOptions = options.filter((o) => o?.value?.includes(searchTerm));
      setItems(filteredOptions);
    }
  }, [options, searchTerm]);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const onButtonClick = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };

  const closePopover = () => {
    setIsPopoverOpen(false);
    setSearchTerm('');
  };

  const handleOnChange = (index: number) => {
    if (!items[index] || !Array.isArray(checkedOptions) || onChange === undefined) {
      return;
    }
    const item = items[index];
    const foundIndex = checkedOptions.findIndex((fieldValue) => fieldValue === item.value);
    if (foundIndex > -1) {
      onChange(checkedOptions.filter((_, idx) => idx !== foundIndex));
    } else {
      onChange([...checkedOptions, item.value]);
    }
  };

  const button = (
    <EuiFilterButton
      data-test-subj={`${dataTestSubj}-button`}
      iconType="arrowDown"
      onClick={onButtonClick}
      isSelected={isPopoverOpen}
      numFilters={items.length}
      hasActiveFilters={checkedOptions && checkedOptions.length > 0}
      numActiveFilters={checkedOptions && checkedOptions.length}
    >
      {title}
    </EuiFilterButton>
  );

  return (
    <EuiFilterGroup data-test-subj={dataTestSubj} style={{ marginLeft: 8 }}>
      <EuiPopover
        ownFocus
        data-test-subj={`${dataTestSubj}-popover`}
        button={button}
        isOpen={isPopoverOpen}
        closePopover={closePopover}
        panelPaddingSize="none"
      >
        <EuiPopoverTitle paddingSize="s">
          <EuiFieldSearch
            compressed
            onChange={(e) => setSearchTerm(e.target.value)}
            data-test-subj={`${dataTestSubj}-searchInput`}
          />
        </EuiPopoverTitle>
        <div style={{ maxHeight: 250, overflow: 'auto' }}>
          {Array.isArray(items) && items.length > 0 ? (
            items.map((item, index) => {
              const checked =
                checkedOptions &&
                checkedOptions.findIndex((fieldValue) => fieldValue === item.value) > -1;

              return (
                <EuiFilterSelectItem
                  checked={checked ? 'on' : undefined}
                  key={index}
                  onClick={() => handleOnChange(index)}
                  style={{
                    flexDirection: 'row',
                    color:
                      item.disabled === true
                        ? euiTheme.euiColorDisabledText
                        : euiTheme.euiTextColor,
                  }}
                  data-test-subj={`${dataTestSubj}-option-${item.value}${
                    checked ? '-checked' : ''
                  }`}
                >
                  {item.name ?? item.value}
                </EuiFilterSelectItem>
              );
            })
          ) : (
            <NoFilterItems />
          )}
        </div>
      </EuiPopover>
    </EuiFilterGroup>
  );
};
