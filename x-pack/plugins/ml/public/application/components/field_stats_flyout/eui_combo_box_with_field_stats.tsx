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
import { EuiFieldSearch, EuiFormRow } from '@elastic/eui';
import { EuiSelectable } from '@elastic/eui';
import {
  EuiPopoverFooter,
  EuiButtonGroup,
  useEuiBackgroundColor,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInputPopover,
  htmlIdGenerator,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { debounce } from 'lodash';
import { i18n } from '@kbn/i18n';
import { useFieldStatsTrigger } from './use_field_stats_trigger';
import { useCurrentThemeVars } from '../../contexts/kibana';

const MIN_POPOVER_WIDTH = 300;
const CHANGE_CHECK_DEBOUNCE = 100;

const OptionsListPopoverActionBar = ({ searchString, updateSearchString, showOnlySelected }) => {
  return (
    <div className="optionsList__actions">
      <EuiFormRow className="optionsList__searchRow" fullWidth>
        <EuiFieldSearch
          isInvalid={!searchString.valid}
          compressed
          disabled={showOnlySelected}
          fullWidth
          onChange={(event) => updateSearchString(event.target.value)}
          value={searchString.value}
          data-test-subj="optionsList-control-search-input"
          // placeholder={OptionsListStrings.popover.getSearchPlaceholder(
          //   allowExpensiveQueries ? defaultSearchTechnique : 'exact'
          // )}
        />
      </EuiFormRow>

      {/* <EuiFormRow className="optionsList__actionsRow" fullWidth>
        <EuiFlexGroup
          justifyContent="spaceBetween"
          alignItems="center"
          gutterSize="s"
          responsive={false}
        >
          {allowExpensiveQueries && (
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued" data-test-subj="optionsList-cardinality-label">
                {OptionsListStrings.popover.getCardinalityLabel(totalCardinality)}
              </EuiText>
            </EuiFlexItem>
          )}
          {invalidSelections && invalidSelections.length > 0 && (
            <>
              {allowExpensiveQueries && (
                <EuiFlexItem grow={false}>
                  <div className="optionsList__actionBarDivider" />
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {OptionsListStrings.popover.getInvalidSelectionsLabel(invalidSelections.length)}
                </EuiText>
              </EuiFlexItem>
            </>
          )}
          <EuiFlexItem grow={true}>
            <EuiFlexGroup
              gutterSize="xs"
              alignItems="center"
              justifyContent="flexEnd"
              responsive={false}
            >
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  position="top"
                  content={
                    showOnlySelected
                      ? OptionsListStrings.popover.getAllOptionsButtonTitle()
                      : OptionsListStrings.popover.getSelectedOptionsButtonTitle()
                  }
                >
                  <EuiButtonIcon
                    size="xs"
                    iconType="list"
                    aria-pressed={showOnlySelected}
                    color={showOnlySelected ? 'primary' : 'text'}
                    display={showOnlySelected ? 'base' : 'empty'}
                    onClick={() => setShowOnlySelected(!showOnlySelected)}
                    data-test-subj="optionsList-control-show-only-selected"
                    aria-label={
                      showOnlySelected
                        ? OptionsListStrings.popover.getAllOptionsButtonTitle()
                        : OptionsListStrings.popover.getSelectedOptionsButtonTitle()
                    }
                  />
                </EuiToolTip>
              </EuiFlexItem>
              {!hideSort && (
                <EuiFlexItem grow={false}>
                  <OptionsListPopoverSortingButton showOnlySelected={showOnlySelected} />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow> */}
    </div>
  );
};

const OptionsListPopoverSuggestions = ({
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
        key: suggestion.field.id,
        checked: undefined,
        // checked: selectedOptionsSet?.has(suggestion.value) ? 'on' : undefined,
        'data-test-subj': `optionsList-control-selection-${suggestion.value}`,
      };
    });
    setSelectableOptions(_selectableOptions);
  }, []);

  return (
    <EuiSelectable
      searchable
      options={selectableOptions}
      renderOption={(option) => renderOption(option)}
      listProps={{ onFocusBadge: false }}
      // aria-label={OptionsListStrings.popover.getSuggestionsAriaLabel(
      //   fieldName,
      //   selectableOptions.length
      // )}
      // emptyMessage={<OptionsListPopoverEmptyMessage showOnlySelected={showOnlySelected} />}
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

const aggregationToggleButtons = [
  {
    id: 'optionsList__includeResults',
    key: 'optionsList__includeResults',
    label: 'Show all',
  },
  {
    id: 'optionsList__excludeResults',
    key: 'optionsList__excludeResults',
    label: 'Hide empty fields',
  },
];

const OptionsListPopoverFooter = () => {
  const [exclude, setExclude] = useState(true);
  const { euiTheme } = useCurrentThemeVars();

  return (
    <>
      <EuiPopoverFooter
        paddingSize="none"
        css={css`
          height: ${euiTheme.euiButtonHeight};
          background-color: ${useEuiBackgroundColor('subdued')};
        `}
      >
        {/* {isLoading && (
          <div style={{ position: 'absolute', width: '100%' }}>
            <EuiProgress
              data-test-subj="optionsList-control-popover-loading"
              size="xs"
              color="accent"
            />
          </div>
        )}
 */}
        <EuiFlexGroup
          gutterSize="xs"
          responsive={false}
          alignItems="center"
          css={css`
            padding: ${euiTheme.euiPaddingSizeS};
          `}
          justifyContent={'spaceBetween'}
        >
          <EuiFlexItem grow={false}>
            <EuiButtonGroup
              legend={'legend'}
              options={aggregationToggleButtons}
              idSelected={exclude ? 'optionsList__excludeResults' : 'optionsList__includeResults'}
              onChange={(optionId) => setExclude(optionId === 'optionsList__excludeResults')}
              buttonSize="compressed"
              data-test-subj="optionsList__includeExcludeButtonGroup"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverFooter>
    </>
  );
};

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
  // const optionsList = useOptionsList();

  // const field = optionsList.select((state) => state.componentState.field);
  // const availableOptions = optionsList.select((state) => state.componentState.availableOptions);
  // const invalidSelections = optionsList.select((state) => state.componentState.invalidSelections);

  // const id = optionsList.select((state) => state.explicitInput.id);
  // const hideExclude = optionsList.select((state) => state.explicitInput.hideExclude);
  // const hideActionBar = optionsList.select((state) => state.explicitInput.hideActionBar);

  const [hideExclude, setHideExclude] = useState(false);
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const id = useMemo(() => htmlIdGenerator()(), []);

  return (
    <div
      id={`control-popover-${id}`}
      className={'optionsList__popover'}
      data-test-subj={`optionsList-control-popover`}
    >
      {/* <OptionsListPopoverActionBar
        searchString={searchString}
        showOnlySelected={showOnlySelected}
        updateSearchString={updateSearchString}
        setShowOnlySelected={setShowOnlySelected}
      /> */}
      <div
        data-test-subj={`optionsList-control-available-options`}
        css={css({ width: '100%', height: '100%' })}
      >
        <OptionsListPopoverSuggestions
          renderOption={renderOption}
          options={options}
          showOnlySelected={showOnlySelected}
          singleSelection={singleSelection}
          onChange={onChange}
          setPopoverOpen={setPopoverOpen}
        />
      </div>
      {!hideExclude && <OptionsListPopoverFooter isLoading={isLoading} />}
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

export const EuiComboBoxWithFieldStats: FC<
  EuiComboBoxProps<string | number | string[] | undefined>
> = ({
  options,
  placeholder,
  singleSelection,
  onChange,
  ariaLabel,
  selectedOptions,
  ...restProps
}) => {
  const { euiTheme } = useCurrentThemeVars();
  const comboBoxStyle = css`
    margin: 2px;
    .optionsList--filterGroup {
      width: 100%;
      box-shadow: none;
      background-color: transparent;

      .optionsList__inputButtonOverride {
        max-inline-size: none;
      }

      .optionsList--filterBtn {
        height: ${euiTheme.euiButtonHeight};
        font-weight: ${euiTheme.euiFontWeightRegular};

        &.optionsList--filterBtnPlaceholder {
          color: ${euiTheme.euiTextSubduedColor};
        }

        .optionsList__selections {
          overflow: hidden !important;
        }

        .optionsList__filter {
          font-weight: ${euiTheme.euiFontWeightMedium};
        }

        .optionsList__filterInvalid {
          color: ${euiTheme.euiColorWarningText};
        }

        .optionsList__negateLabel {
          font-weight: ${euiTheme.euiFontWeightSemiBold};
          font-size: ${euiTheme.euiSizeM};
          color: ${euiTheme.euiColorDanger};
        }

        .optionsList--selectionText {
          flex-grow: 1;
          text-align: left;
        }
      }
    }

    .optionsList--sortPopover {
      width: ${euiTheme.euiSizeXL * 7};
    }

    .optionsList__existsFilter {
      font-style: italic;
      font-weight: ${euiTheme.euiFontWeightMedium};
    }

    .optionsList__popoverOverride {
      filter: none;
    }
    .optionsList__popover {
      .optionsList__actions {
        padding: 0 ${euiTheme.euiSizeS};
        border-bottom: ${euiTheme.euiBorderThin};
        border-color: ${euiTheme.euiColorLightestShade};

        .optionsList__searchRow {
          padding-top: ${euiTheme.euiSizeS};
        }

        .optionsList__actionsRow {
          margin: calc(${euiTheme.euiSizeS} / 2) 0 !important;

          .optionsList__actionBarDivider {
            height: ${euiTheme.euiSize};
            border-right: ${euiTheme.euiBorderThin};
          }
        }
      }

      .optionsList-control-ignored-selection-title {
        padding-left: ${euiTheme.euiSizeM};
      }

      .optionsList__selectionInvalid {
        color: ${euiTheme.euiColorWarningText};
      }

      .optionslist--loadingMoreGroupLabel {
        text-align: center;
        padding: ${euiTheme.euiSizeM};
        font-style: italic;
        height:  ${euiTheme.euiSizeXXL} !important;
      }

      .optionslist--endOfOptionsGroupLabel {
        text-align: center;
        font-size: ${euiTheme.euiSizeM};
        height:  auto !important;
        color: ${euiTheme.euiTextSubduedColor};
        padding: ${euiTheme.euiSizeM};
      }
    }

    }
  `;

  const { renderOption } = useFieldStatsTrigger();
  const [searchString, updateSearchString] = useState({ value: '', valid: true });
  const [isPopoverOpen, setPopoverOpen] = useState(false);

  // debounce loading state so loading doesn't flash when user types
  const [debouncedLoading, setDebouncedLoading] = useState(false);
  const debounceSetLoading = useMemo(
    () =>
      debounce((latestLoading: boolean) => {
        setDebouncedLoading(latestLoading);
      }, 100),
    []
  );
  // useEffect(() => debounceSetLoading(loading ?? false), [loading, debounceSetLoading]);
  const popoverId = useMemo(() => htmlIdGenerator()(), []);
  const controlStyle = 'oneLine';
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
        isLoading={debouncedLoading}
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
            isLoading={debouncedLoading}
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
