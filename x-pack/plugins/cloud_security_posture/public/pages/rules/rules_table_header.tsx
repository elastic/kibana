/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import {
  EuiFieldSearch,
  EuiFlexItem,
  EuiText,
  EuiSpacer,
  EuiFlexGroup,
  EuiPopover,
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopoverTitle,
  EuiFilterGroup,
  EuiFilterButton,
} from '@elastic/eui';
import useDebounce from 'react-use/lib/useDebounce';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import {
  RuleStateAttributesWithoutStates,
  useChangeCspRuleState,
} from './use_change_csp_rule_state';
import { CspBenchmarkRulesWithStates } from './rules_container';
import { MultiSelectFilter } from '../../common/component/multi_select_filter';

export const RULES_BULK_ACTION_BUTTON = 'bulk-action-button';
export const RULES_BULK_ACTION_OPTION_ENABLE = 'bulk-action-option-enable';
export const RULES_BULK_ACTION_OPTION_DISABLE = 'bulk-action-option-disable';
export const RULES_SELECT_ALL_RULES = 'select-all-rules-button';
export const RULES_CLEAR_ALL_RULES_SELECTION = 'clear-rules-selection-button';
export const RULES_DISABLED_FILTER = 'rules-disabled-filter';
export const RULES_ENABLED_FILTER = 'rules-enabled-filter';

interface RulesTableToolbarProps {
  search: (value: string) => void;
  onSectionChange: (value: string[] | undefined) => void;
  onRuleNumberChange: (value: string[] | undefined) => void;
  sectionSelectOptions: string[];
  ruleNumberSelectOptions: string[];
  totalRulesCount: number;
  searchValue: string;
  isSearching: boolean;
  pageSize: number;
  selectedRules: CspBenchmarkRulesWithStates[];
  setEnabledDisabledItemsFilter: (filterState: string) => void;
  enabledDisabledItemsFilterState: string;
  setSelectAllRules: () => void;
  setSelectedRules: (rules: CspBenchmarkRulesWithStates[]) => void;
}

interface RuleTableCount {
  pageSize: number;
  total: number;
  selectedRules: CspBenchmarkRulesWithStates[];
  setSelectAllRules: () => void;
  setSelectedRules: (rules: CspBenchmarkRulesWithStates[]) => void;
}

export const RulesTableHeader = ({
  search,
  searchValue,
  isSearching,
  totalRulesCount,
  pageSize,
  onSectionChange,
  onRuleNumberChange,
  sectionSelectOptions,
  ruleNumberSelectOptions,
  selectedRules,
  setEnabledDisabledItemsFilter,
  enabledDisabledItemsFilterState,
  setSelectAllRules,
  setSelectedRules,
}: RulesTableToolbarProps) => {
  const [selectedSection, setSelectedSection] = useState<string[]>([]);
  const [selectedRuleNumber, setSelectedRuleNumber] = useState<string[]>([]);
  const sectionOptions = sectionSelectOptions.map((option) => ({
    key: option,
    label: option,
  }));
  const ruleNumberOptions = ruleNumberSelectOptions.map((option) => ({
    key: option,
    label: option,
  }));

  const toggleEnabledRulesFilter = () => {
    if (enabledDisabledItemsFilterState === 'enabled') setEnabledDisabledItemsFilter('no-filter');
    else setEnabledDisabledItemsFilter('enabled');
  };

  const toggleDisabledRulesFilter = () => {
    if (enabledDisabledItemsFilterState === 'disabled') setEnabledDisabledItemsFilter('no-filter');
    else setEnabledDisabledItemsFilter('disabled');
  };

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexGroup wrap={true}>
        <EuiFlexItem grow={1}>
          <SearchField isSearching={isSearching} searchValue={searchValue} search={search} />
        </EuiFlexItem>
        <EuiFlexItem grow={0}>
          <EuiFlexGroup gutterSize="s" direction="row">
            <EuiFlexItem
              css={css`
                min-width: 160px;
              `}
            >
              <MultiSelectFilter
                buttonLabel={i18n.translate(
                  'xpack.csp.rules.rulesTableHeader.sectionSelectPlaceholder',
                  {
                    defaultMessage: 'CIS Section',
                  }
                )}
                id={'cis-section-multi-select-filter'}
                onChange={(section) => {
                  setSelectedSection([...section?.selectedOptionKeys]);
                  onSectionChange(
                    section?.selectedOptionKeys ? section?.selectedOptionKeys : undefined
                  );
                }}
                options={sectionOptions}
                selectedOptionKeys={selectedSection}
              />
            </EuiFlexItem>
            <EuiFlexItem
              css={css`
                min-width: 160px;
              `}
            >
              <MultiSelectFilter
                buttonLabel={i18n.translate(
                  'xpack.csp.rules.rulesTableHeader.ruleNumberSelectPlaceholder',
                  {
                    defaultMessage: 'Rule Number',
                  }
                )}
                id={'rule-number-multi-select-filter'}
                onChange={(ruleNumber) => {
                  setSelectedRuleNumber([...ruleNumber?.selectedOptionKeys]);
                  onRuleNumberChange(
                    ruleNumber?.selectedOptionKeys ? ruleNumber?.selectedOptionKeys : undefined
                  );
                }}
                options={ruleNumberOptions}
                selectedOptionKeys={selectedRuleNumber}
              />
            </EuiFlexItem>
            <EuiFlexItem
              css={css`
                min-width: 220px;
              `}
            >
              <EuiFilterGroup>
                <EuiFilterButton
                  withNext
                  hasActiveFilters={enabledDisabledItemsFilterState === 'enabled'}
                  onClick={toggleEnabledRulesFilter}
                  data-test-subj={RULES_ENABLED_FILTER}
                >
                  <FormattedMessage
                    id="xpack.csp.rules.rulesTable.enabledRuleFilterButton"
                    defaultMessage="Enabled rules"
                  />
                </EuiFilterButton>
                <EuiFilterButton
                  hasActiveFilters={enabledDisabledItemsFilterState === 'disabled'}
                  onClick={toggleDisabledRulesFilter}
                  data-test-subj={RULES_DISABLED_FILTER}
                >
                  <FormattedMessage
                    id="xpack.csp.rules.rulesTable.disabledRuleFilterButton"
                    defaultMessage="Disabled rules"
                  />
                </EuiFilterButton>
              </EuiFilterGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexItem>
        <CurrentPageOfTotal
          pageSize={pageSize}
          total={totalRulesCount}
          selectedRules={selectedRules}
          setSelectAllRules={setSelectAllRules}
          setSelectedRules={setSelectedRules}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const SEARCH_DEBOUNCE_MS = 300;

const SearchField = ({
  search,
  isSearching,
  searchValue,
}: Pick<RulesTableToolbarProps, 'isSearching' | 'searchValue' | 'search'>) => {
  const [localValue, setLocalValue] = useState(searchValue);

  useDebounce(() => search(localValue), SEARCH_DEBOUNCE_MS, [localValue]);

  return (
    <div>
      <EuiFlexItem grow={true} css={{ alignItems: 'flex-end' }}>
        <EuiFieldSearch
          isLoading={isSearching}
          placeholder={i18n.translate('xpack.csp.rules.rulesTable.searchPlaceholder', {
            defaultMessage: 'Search by Rule Name',
          })}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          css={{ minWidth: 150 }}
          fullWidth
        />
      </EuiFlexItem>
    </div>
  );
};

const CurrentPageOfTotal = ({
  pageSize,
  total,
  selectedRules,
  setSelectAllRules,
  setSelectedRules,
}: RuleTableCount) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const onPopoverClick = () => {
    setIsPopoverOpen((e) => !e);
  };

  const { mutate: mutateRulesStates } = useChangeCspRuleState();

  const changeCspRuleState = (state: 'mute' | 'unmute') => {
    const bulkSelectedRules: RuleStateAttributesWithoutStates[] = selectedRules.map(
      (e: CspBenchmarkRulesWithStates) => ({
        benchmark_id: e?.metadata.benchmark.id,
        benchmark_version: e?.metadata.benchmark.version,
        rule_number: e?.metadata.benchmark.rule_number!,
        rule_id: e?.metadata.id,
      })
    );
    // Only do the API Call IF there are no undefined value for rule number in the selected rules
    if (!bulkSelectedRules.some((rule) => rule.rule_number === undefined)) {
      mutateRulesStates({
        newState: state,
        ruleIds: bulkSelectedRules,
      });
      setIsPopoverOpen(false);
    }
    setSelectedRules([]);
  };

  const changeCspRuleStateMute = () => {
    changeCspRuleState('mute');
  };
  const changeCspRuleStateUnmute = () => {
    changeCspRuleState('unmute');
  };

  const areAllSelectedRulesMuted = selectedRules.every((rule) => rule?.state === 'muted');
  const areAllSelectedRulesUnmuted = selectedRules.every((rule) => rule?.state === 'unmuted');

  const popoverButton = (
    <EuiButtonEmpty
      onClick={onPopoverClick}
      size="xs"
      iconType="arrowDown"
      iconSide="right"
      data-test-subj={RULES_BULK_ACTION_BUTTON}
    >
      Bulk actions
    </EuiButtonEmpty>
  );
  const items = [
    <EuiContextMenuItem
      disabled={selectedRules.length === 0 || areAllSelectedRulesUnmuted}
      onClick={changeCspRuleStateUnmute}
      data-test-subj={RULES_BULK_ACTION_OPTION_ENABLE}
    >
      <EuiText key="disabled">
        <FormattedMessage id="xpack.csp.rules.rulesTable.optionEnable" defaultMessage="Enable" />
      </EuiText>
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      disabled={selectedRules.length === 0 || areAllSelectedRulesMuted}
      onClick={changeCspRuleStateMute}
      data-test-subj={RULES_BULK_ACTION_OPTION_DISABLE}
    >
      <EuiText>
        <FormattedMessage id="xpack.csp.rules.rulesTable.optionDisable" defaultMessage="Disable" />
      </EuiText>
    </EuiContextMenuItem>,
  ];

  return (
    <EuiFlexItem grow={false}>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" alignItems={'center'}>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" textAlign="left" color="subdued" css={{ marginLeft: '8px' }}>
            <FormattedMessage
              id="xpack.csp.rules.rulesTable.showingPageOfTotalLabel"
              defaultMessage="Showing {pageSize} of {total, plural, one {# rule} other {# rules}} {pipe} Selected {selectedRulesAmount, plural, one {# rule} other {# rules}}"
              values={{
                pageSize,
                total,
                selectedRulesAmount: selectedRules.length || 0,
                pipe: '\u2000|\u2000',
              }}
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {selectedRules.length !== total ? (
            <EuiButtonEmpty
              onClick={setSelectAllRules}
              size="xs"
              iconType="pagesSelect"
              data-test-subj={RULES_SELECT_ALL_RULES}
            >
              <FormattedMessage
                id="xpack.csp.rules.rulesTable.selectAllRulesOption"
                defaultMessage="Select All {total, plural, one {# rule} other {# rules}}"
                values={{ total }}
              />
            </EuiButtonEmpty>
          ) : (
            <EuiButtonEmpty
              onClick={() => setSelectedRules([])}
              size="xs"
              iconType="cross"
              data-test-subj={RULES_CLEAR_ALL_RULES_SELECTION}
            >
              <FormattedMessage
                id="xpack.csp.rules.rulesTable.clearSelectionOption"
                defaultMessage="Clear selection"
              />
            </EuiButtonEmpty>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPopover
            button={popoverButton}
            isOpen={isPopoverOpen}
            closePopover={() => setIsPopoverOpen(false)}
            anchorPosition="downLeft"
            panelPaddingSize="s"
          >
            <EuiPopoverTitle css={{ minWidth: 240 }}>
              <EuiText size="s" textAlign="left" color="subdued" css={{ marginLeft: '8px' }}>
                <b>
                  <FormattedMessage
                    id="xpack.csp.rules.rulesTable.bulkActionsOptionTitle"
                    defaultMessage="Options"
                  />
                </b>
              </EuiText>
            </EuiPopoverTitle>
            <EuiContextMenuPanel
              size="s"
              items={items}
              css={css`
                mid-width: 540px;
              `}
            />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
