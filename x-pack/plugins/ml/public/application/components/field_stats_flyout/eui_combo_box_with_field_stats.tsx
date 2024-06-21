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
  EuiIcon,
  EuiBadge,
  EuiFlexItem,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { isDefined } from '@kbn/ml-is-defined';
import type { Field } from '@kbn/ml-anomaly-utils';
import type { Aggregation } from '../../../../server/shared';
import { useFieldStatsTrigger } from './use_field_stats_trigger';
import { useCurrentThemeVars } from '../../contexts/kibana';
import { useFieldStatsFlyoutContext } from './use_field_stats_flytout_context';

const MIN_POPOVER_WIDTH = 300;

export type DropDownLabel = EuiSelectableOption<{
  key: string;
  label: string | React.ReactNode;
  isEmpty?: boolean;
  'data-is-empty'?: boolean;
  isGroupLabelOption?: boolean;
  isGroupLabel?: boolean;
  field?: Field;
  agg?: Omit<Aggregation, 'fields'>;
}>;

interface OptionsListPopoverSuggestionsProps {
  options: DropDownLabel[];
  renderOption: (option: DropDownLabel) => React.ReactNode;
  singleSelection?: boolean;
  onChange?: (newSuggestions: DropDownLabel[]) => void;
  setPopoverOpen: (open: boolean) => void;
}
const OptionsListPopoverSuggestions: FC<OptionsListPopoverSuggestionsProps> = ({
  options,
  renderOption,
  singleSelection,
  onChange,
  setPopoverOpen,
}) => {
  const [selectableOptions, setSelectableOptions] = useState<DropDownLabel[]>([]); // will be set in following useEffect
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
  }, [options]);

  return (
    <EuiSelectable
      searchable
      options={selectableOptions}
      renderOption={renderOption}
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
  options: DropDownLabel[];
  renderOption: (option: DropDownLabel) => React.ReactNode;
  singleSelection?: boolean;
  onChange?: (newSuggestions: DropDownLabel[]) => void;
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
          if (isDefined(option['data-is-empty'])) {
            return !option['data-is-empty'];
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
  options: DropDownLabel[];
  placeholder?: string;
  'aria-label'?: string;
  singleSelection?: boolean;
  // renderOption: (option: DropDownLabel, searchValue: string) => React.ReactNode;
  onChange: (newSuggestions: DropDownLabel[]) => void;
  selectedOptions?: Array<{ label: string }>;
  fullWidth?: boolean;
  isDisabled?: boolean;
  isLoading?: boolean;
  isClearable?: boolean;
  isInvalid?: boolean;
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
  isClearable,
  'aria-label': ariaLabel,
}) => {
  const { euiTheme } = useCurrentThemeVars();
  const { renderOption } = useFieldStatsTrigger();
  const [isPopoverOpen, setPopoverOpen] = useState(false);

  const popoverId = useMemo(() => htmlIdGenerator()(), []);
  const comboBoxOptions: DropDownLabel[] = useMemo(
    () =>
      Array.isArray(options)
        ? options.map(({ isEmpty, ...o }) => ({
            ...o,
            css: optionCss,
            // Change data-is-empty- because EUI is passing all props to dom element
            // so isEmpty is invalid, but we need this info to render option correctly
            'data-is-empty': isEmpty,
          }))
        : [],
    [options]
  );
  const hasSelections = useMemo(() => selectedOptions?.length ?? 0 > 0, [selectedOptions]);
  const id = useMemo(() => htmlIdGenerator()(), []);
  const selectionDisplayNode = selectedOptions?.map((option) => (
    <EuiFlexItem grow={false} key={`${id}-${option.label}`}>
      <EuiBadge className="euiComboBoxPill eui-textTruncate" color="hollow">
        {option.label}
      </EuiBadge>
    </EuiFlexItem>
  ));
  const button = (
    <>
      <EuiFilterButton
        isDisabled={isDisabled}
        placeholder={placeholder}
        badgeColor="success"
        iconType="arrowDown"
        isLoading={isLoading}
        grow
        css={css({
          padding: hasSelections ? euiTheme.euiSizeXS : undefined,
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
        <div
          className="euiComboBox__inputWrap"
          css={css({
            display: 'flex',
            alignItems: 'center',
            flexDirection: 'row',
          })}
        >
          {hasSelections ? selectionDisplayNode : placeholder ?? FALLBACK_PLACEHOLDER}
          {isClearable && hasSelections ? (
            <button
              css={css({ marginLeft: euiTheme.euiSizeS })}
              type="button"
              className={'euiFormControlLayoutClearButton'}
              onClick={() => onChange([])}
              aria-label={i18n.translate('xpack.plugins.ml.controls.optionsList.clearButtonLabel', {
                defaultMessage: 'Clear',
              })}
            >
              <EuiIcon className="euiFormControlLayoutClearButton__icon" type="cross" />
            </button>
          ) : null}
        </div>
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
