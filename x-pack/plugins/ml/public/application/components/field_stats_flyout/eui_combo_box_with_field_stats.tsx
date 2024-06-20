/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useEffect, useMemo, useState } from 'react';
import type { EuiComboBoxProps } from '@elastic/eui/src/components/combo_box/combo_box';
import type { EuiComboBoxOptionOption, EuiSelectableOption } from '@elastic/eui';
import { EuiSwitch } from '@elastic/eui';
import { EuiSelectable } from '@elastic/eui';
import {
  EuiPopoverFooter,
  useEuiBackgroundColor,
  EuiFilterButton,
  EuiFilterGroup,
  EuiInputPopover,
  htmlIdGenerator,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useFieldStatsTrigger } from './use_field_stats_trigger';
import { useCurrentThemeVars } from '../../contexts/kibana';
import { useFieldStatsFlyoutContext } from './use_field_stats_flytout_context';

const MIN_POPOVER_WIDTH = 300;

interface OptionsListPopoverSuggestionsProps {
  options: EuiSelectableOption[];
  renderOption: (option: EuiSelectableOption) => React.ReactNode;
  singleSelection: boolean;
  onChange: (newSuggestions: EuiSelectableOption[]) => void;
  setPopoverOpen: (open: boolean) => void;
}
const OptionsListPopoverSuggestions: FC<OptionsListPopoverSuggestionsProps> = ({
  options,
  renderOption,
  singleSelection,
  onChange,
  setPopoverOpen,
}) => {
  const [selectableOptions, setSelectableOptions] = useState<EuiSelectableOption[]>([]); // will be set in following useEffect
  useEffect(() => {
    /* This useEffect makes selectableOptions responsive to search, show only selected, and clear selections */
    const _selectableOptions = (options ?? []).map((suggestion) => {
      return {
        ...suggestion,
        key: suggestion.label ?? suggestion.field?.id,
        checked: undefined,
        // checked: selectedOptionsSet?.has(suggestion.value) ? 'on' : undefined,
        'data-test-subj': `optionsList-control-selection-${suggestion.value}`,
      };
    });
    setSelectableOptions(_selectableOptions);
  }, [options.length]);

  return (
    <EuiSelectable
      searchable
      options={selectableOptions}
      renderOption={(option) => renderOption(option)}
      listProps={{ onFocusBadge: false }}
      onChange={(newSuggestions, _, changedOption) => {
        if (singleSelection) {
          if (onChange) {
            onChange([changedOption]);
            setPopoverOpen(false);
          }
        }
      }}
    >
      {(list, search) => (
        <>
          {search}
          {list}
        </>
      )}
    </EuiSelectable>
  );
};

const OptionsListPopoverFooter = ({ showEmptyFields, setShowEmptyFields }) => {
  const { euiTheme } = useCurrentThemeVars();

  return (
    <>
      <EuiPopoverFooter
        paddingSize="none"
        css={css({
          height: euiTheme.euiButtonHeight,
          backgroundColor: useEuiBackgroundColor('subdued'),
          alignItems: 'center',
          display: 'flex',
          paddingLeft: euiTheme.euiSizeS,
        })}
      >
        <EuiSwitch
          label={i18n.translate(
            'xpack.plugins.ml.controls.optionsList.popover.includeEmptyFieldsLabel',
            {
              defaultMessage: 'Include empty fields',
            }
          )}
          checked={showEmptyFields}
          onChange={(e) => setShowEmptyFields(e.target.checked)}
        />
      </EuiPopoverFooter>
    </>
  );
};

interface OptionsListPopoverProps {
  isLoading: boolean;
  updateSearchString: (searchString: { value: string; valid: boolean }) => void;
  loadMoreSuggestions: () => void;
  options: EuiSelectableOption[];
  renderOption: (option: EuiSelectableOption) => React.ReactNode;
  searchString: { value: string; valid: boolean };
  singleSelection: boolean;
  onChange: (newSuggestions: EuiSelectableOption[]) => void;
  setPopoverOpen: (open: boolean) => void;
}
const OptionsListPopover = ({
  isLoading,
  updateSearchString,
  loadMoreSuggestions,
  options,
  renderOption,
  searchString,
  singleSelection,
  onChange,
  setPopoverOpen,
}: OptionsListPopoverProps) => {
  const { populatedFields } = useFieldStatsFlyoutContext();

  const [showEmptyFields, setShowEmptyFields] = useState(false);
  const id = useMemo(() => htmlIdGenerator()(), []);

  const filteredOptions = useMemo(() => {
    return showEmptyFields
      ? options
      : options.filter((option) => {
          if (option.key === 'Event rate' || option.field?.id === '__ml_event_rate_count__')
            return true;
          if (option.isGroupLabel)
            return populatedFields?.has(option.key ?? option.searchableLabel);
          if (option.field) {
            return populatedFields?.has(option.field.id);
          }
          return true;
        });
  }, [options, showEmptyFields, populatedFields]);
  return (
    <div
      id={`control-popover-${id}`}
      className={'optionsList__popover'}
      data-test-subj={`optionsList-control-popover`}
    >
      <div
        data-test-subj={`optionsList-control-available-options`}
        css={css({ width: '100%', height: '100%' })}
      >
        <OptionsListPopoverSuggestions
          renderOption={renderOption}
          options={filteredOptions}
          singleSelection={singleSelection}
          onChange={onChange}
          setPopoverOpen={setPopoverOpen}
        />
      </div>
      <OptionsListPopoverFooter
        showEmptyFields={showEmptyFields}
        setShowEmptyFields={setShowEmptyFields}
      />
    </div>
  );
};

export const optionCss = css`
  .euiComboBoxOption__enterBadge {
    display: none;
  }
  .euiFlexGroup {
    gap: 0px;
  }
  .euiComboBoxOption__content {
    margin-left: 2px;
  }
`;

const FALLBACK_PLACEHOLDER = i18n.translate('xpack.plugins.ml.selectOption.placeholder', {
  defaultMessage: 'Any',
});

type OptionWithFieldStats = EuiSelectableOption<{ field: { id: string } }>;
interface EuiComboBoxWithFieldStatsProps
  extends EuiComboBoxProps<string | number | string[] | undefined> {
  ariaLabel: string;
}
export const EuiComboBoxWithFieldStats: FC<EuiComboBoxWithFieldStatsProps> = ({
  options,
  placeholder,
  singleSelection,
  onChange,
  selectedOptions,
  isLoading,
  ariaLabel,
  ...restProps
}) => {
  const { euiTheme } = useCurrentThemeVars();
  const { renderOption } = useFieldStatsTrigger();
  const [searchString, updateSearchString] = useState({ value: '', valid: true });
  const [isPopoverOpen, setPopoverOpen] = useState(false);

  const popoverId = useMemo(() => htmlIdGenerator()(), []);
  const comboBoxOptions: EuiComboBoxOptionOption[] = useMemo(
    () =>
      Array.isArray(options)
        ? options.map((o) => ({
            ...o,
            css: optionCss,
          }))
        : [],
    [options]
  );
  const selectedOptionsCount = selectedOptions?.length ?? 0;
  const hasSelections = selectedOptionsCount > 0;
  const loadMoreSuggestions = () => {};
  const id = useMemo(() => htmlIdGenerator()(), []);
  const selectionDisplayNode = selectedOptions?.map((option) => option.label).join(', ');
  const button = (
    <>
      <EuiFilterButton
        placeholder={placeholder}
        badgeColor="success"
        iconType="arrowDown"
        isLoading={isLoading}
        css={css({
          height: euiTheme.euiButtonHeight,
          fontWeight: euiTheme.euiFontWeightRegular,
          color: hasSelections ? euiTheme.euiTextColor : euiTheme.euiTextSubduedColor,
        })}
        data-test-subj={`optionsList-control-${id}`}
        onClick={() => setPopoverOpen(true)}
        isSelected={isPopoverOpen}
        numActiveFilters={selectedOptionsCount}
        hasActiveFilters={Boolean(selectedOptionsCount)}
        textProps={{ className: 'optionsList--selectionText' }}
        aria-label={ariaLabel}
        aria-expanded={isPopoverOpen}
        aria-controls={popoverId}
        role="combobox"
      >
        {hasSelections ? selectionDisplayNode : placeholder ?? FALLBACK_PLACEHOLDER}
      </EuiFilterButton>
    </>
  );

  return (
    <div>
      <EuiFilterGroup>
        <EuiInputPopover
          id={popoverId}
          ownFocus
          input={button}
          hasArrow={false}
          repositionOnScroll
          isOpen={isPopoverOpen}
          panelPaddingSize="none"
          panelMinWidth={MIN_POPOVER_WIDTH}
          initialFocus={'[data-test-subj=optionsList-control-search-input]'}
          closePopover={setPopoverOpen.bind(null, false)}
          panelProps={{
            'aria-label': i18n.translate(
              'xpack.plugins.ml.controls.optionsList.popover.ariaLabel',
              {
                defaultMessage: 'Popover for {ariaLabel}',
                values: { ariaLabel },
              }
            ),
          }}
        >
          <OptionsListPopover
            isLoading={isLoading}
            searchString={searchString}
            updateSearchString={updateSearchString}
            loadMoreSuggestions={loadMoreSuggestions}
            options={comboBoxOptions}
            renderOption={renderOption}
            singleSelection={singleSelection}
            onChange={onChange}
            setPopoverOpen={setPopoverOpen}
          />
        </EuiInputPopover>
      </EuiFilterGroup>
    </div>
    // <EuiComboBox
    //   {...restProps}
    //   options={comboBoxOptions}
    // renderOption={renderOption}
    // singleSelection={{ asPlainText: true }}
    // />
  );
};
