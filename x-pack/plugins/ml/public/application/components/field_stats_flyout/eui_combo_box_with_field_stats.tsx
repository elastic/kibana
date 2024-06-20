/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useEffect, useMemo, useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiPopoverFooter,
  useEuiBackgroundColor,
  EuiFilterButton,
  EuiFilterGroup,
  EuiInputPopover,
  htmlIdGenerator,
  EuiSelectable,
  EuiSwitch,
  EuiProgress,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { isDefined } from '@kbn/ml-is-defined';
import { useFieldStatsTrigger } from './use_field_stats_trigger';
import { useCurrentThemeVars } from '../../contexts/kibana';
import { useFieldStatsFlyoutContext } from './use_field_stats_flytout_context';

const MIN_POPOVER_WIDTH = 300;
export type OptionWithFieldStats = EuiSelectableOption<{
  key: string;
  label: string | React.ReactNode;
  isEmpty?: boolean;
  isGroupLabelOption?: boolean;
  isGroupLabel?: boolean;
  field?: { id: string };
}>;

interface OptionsListPopoverSuggestionsProps {
  options: OptionWithFieldStats[];
  renderOption: (option: OptionWithFieldStats) => React.ReactNode;
  singleSelection?: boolean;
  onChange?: (newSuggestions: OptionWithFieldStats[]) => void;
  setPopoverOpen: (open: boolean) => void;
}
const OptionsListPopoverSuggestions: FC<OptionsListPopoverSuggestionsProps> = ({
  options,
  renderOption,
  singleSelection,
  onChange,
  setPopoverOpen,
}) => {
  const [selectableOptions, setSelectableOptions] = useState<OptionWithFieldStats[]>([]); // will be set in following useEffect
  useEffect(() => {
    /* This useEffect makes selectableOptions responsive to search, show only selected, and clear selections */
    const _selectableOptions = (options ?? []).map((suggestion) => {
      return {
        ...suggestion,
        key: suggestion.label ?? suggestion.field?.id,
        checked: undefined,
        'data-test-subj': `optionsList-control-selection-${suggestion.key}`,
      };
    });
    setSelectableOptions(_selectableOptions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

const OptionsListPopoverFooter: FC<{
  showEmptyFields: boolean;
  setShowEmptyFields: (showEmptyFields: boolean) => void;
  isLoading?: boolean;
}> = ({ showEmptyFields, setShowEmptyFields, isLoading }) => {
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
        {isLoading ? (
          <div style={{ position: 'absolute', width: '100%' }}>
            <EuiProgress
              data-test-subj="optionsList-control-popover-loading"
              size="xs"
              color="accent"
            />
          </div>
        ) : null}

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
  options: OptionWithFieldStats[];
  renderOption: (option: OptionWithFieldStats) => React.ReactNode;
  singleSelection?: boolean;
  onChange?: (newSuggestions: OptionWithFieldStats[]) => void;
  setPopoverOpen: (open: boolean) => void;
  isLoading?: boolean;
}
const OptionsListPopover = ({
  options,
  renderOption,
  singleSelection,
  onChange,
  setPopoverOpen,
  isLoading,
}: OptionsListPopoverProps) => {
  const { populatedFields } = useFieldStatsFlyoutContext();

  const [showEmptyFields, setShowEmptyFields] = useState(false);
  const id = useMemo(() => htmlIdGenerator()(), []);

  const filteredOptions = useMemo(() => {
    return showEmptyFields
      ? options
      : options.filter((option) => {
          if (isDefined(option.isEmpty)) {
            return !option.isEmpty;
          }
          if (option.isGroupLabel || option.isGroupLabelOption) {
            return populatedFields?.has(option.key ?? option.searchableLabel);
          }
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
        isLoading={isLoading}
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

interface EuiComboBoxWithFieldStatsProps {
  options: OptionWithFieldStats[];
  placeholder?: string;
  'aria-label'?: string;
  singleSelection?: boolean;
  // renderOption: (option: OptionWithFieldStats, searchValue: string) => React.ReactNode;
  onChange: (newSuggestions: OptionWithFieldStats[]) => void;
  selectedOptions?: Array<{ label: string }>;
  fullWidth?: boolean;
  isDisabled?: boolean;
  isLoading?: boolean;
}
export const EuiComboBoxWithFieldStats: FC<EuiComboBoxWithFieldStatsProps> = ({
  options,
  placeholder,
  singleSelection,
  onChange,
  selectedOptions,
  fullWidth,
  isDisabled,
  isLoading,
  'aria-label': ariaLabel,
}) => {
  const { euiTheme } = useCurrentThemeVars();
  const { renderOption } = useFieldStatsTrigger();
  const [isPopoverOpen, setPopoverOpen] = useState(false);

  const popoverId = useMemo(() => htmlIdGenerator()(), []);
  const comboBoxOptions: OptionWithFieldStats[] = useMemo(
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
  const id = useMemo(() => htmlIdGenerator()(), []);
  const selectionDisplayNode = selectedOptions?.map((option) => option.label).join(', ');
  const button = (
    <>
      <EuiFilterButton
        isDisabled={isDisabled}
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
      <EuiFilterGroup fullWidth={fullWidth}>
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
            options={comboBoxOptions}
            renderOption={renderOption}
            singleSelection={singleSelection}
            onChange={onChange}
            setPopoverOpen={setPopoverOpen}
            isLoading={isLoading}
          />
        </EuiInputPopover>
      </EuiFilterGroup>
    </div>
  );
};
