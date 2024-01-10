/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import {
  EuiComboBox,
  EuiFieldSearch,
  EuiFlexItem,
  EuiText,
  EuiSpacer,
  EuiFlexGroup,
  type EuiComboBoxOptionOption,
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
import { euiThemeVars } from '@kbn/ui-theme';
import { CspBenchmarkRule } from '../../../common/types/latest';
import { useChangeCspRuleStatus } from './change_csp_rule_status';

interface RulesTableToolbarProps {
  search: (value: string) => void;
  onSectionChange: (value: string | undefined) => void;
  onRuleNumberChange: (value: string | undefined) => void;
  sectionSelectOptions: string[];
  ruleNumberSelectOptions: string[];
  totalRulesCount: number;
  searchValue: string;
  isSearching: boolean;
  pageSize: number;
  selectedRules: CspBenchmarkRule[];
  refetchStatus: () => void;
  setEnabledDisabledItemsFilter: (filterState: string) => void;
  currentEnabledDisabledItemsFilterState: string;
  allRules: CspBenchmarkRule[];
  setSelectedRules: (e: CspBenchmarkRule[]) => void;
  setSelectAllRules: () => void;
}

interface RuleTableCount {
  pageSize: number;
  total: number;
  selectedRules: CspBenchmarkRule[];
  refetchStatus: () => void;
  allRules: CspBenchmarkRule[];
  setSelectedRules: (e: CspBenchmarkRule[]) => void;
  setSelectAllRules: () => void;
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
  refetchStatus,
  setEnabledDisabledItemsFilter,
  currentEnabledDisabledItemsFilterState,
  allRules,
  setSelectedRules,
  setSelectAllRules,
}: RulesTableToolbarProps) => {
  const [selectedSection, setSelectedSection] = useState<EuiComboBoxOptionOption[]>([]);
  const [selectedRuleNumber, setSelectedRuleNumber] = useState<EuiComboBoxOptionOption[]>([]);
  const sectionOptions = sectionSelectOptions.map((option) => ({
    label: option,
  }));

  const ruleNumberOptions = ruleNumberSelectOptions.map((option) => ({
    label: option,
  }));
  // const [isEnabledFilterOn, setIsEnabledFilterOn] = useState(false);
  // const [isDisabledFilterOn, setIsDisabledFilterOn] = useState(false);

  // const toggleOnFilter = () => {
  //   setIsEnabledFilterOn(!isEnabledFilterOn);
  //   setIsDisabledFilterOn(isDisabledFilterOn && !isEnabledFilterOn ? false : isDisabledFilterOn);
  // };

  // const toggleOffFilter = () => {
  //   setIsDisabledFilterOn(!isDisabledFilterOn);
  //   setIsEnabledFilterOn(isEnabledFilterOn && !isDisabledFilterOn ? false : isEnabledFilterOn);
  // };

  const [isOnFilterOn, setIsOnFilterOn] = useState(false);
  const [isOffFilterOn, setIsOffFilterOn] = useState(false);

  const toggleOnFilter = () => {
    setIsOnFilterOn(!isOnFilterOn);
    setIsOffFilterOn(isOffFilterOn && !isOnFilterOn ? false : isOffFilterOn);
    if (currentEnabledDisabledItemsFilterState === 'enabled')
      setEnabledDisabledItemsFilter('no-filter');
    else setEnabledDisabledItemsFilter('enabled');
  };

  const toggleOffFilter = () => {
    setIsOffFilterOn(!isOffFilterOn);
    setIsOnFilterOn(isOnFilterOn && !isOffFilterOn ? false : isOnFilterOn);
    if (currentEnabledDisabledItemsFilterState === 'disabled')
      setEnabledDisabledItemsFilter('no-filter');
    else setEnabledDisabledItemsFilter('disabled');
  };

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={1}>
        <SearchField
          isSearching={isSearching}
          searchValue={searchValue}
          search={search}
          totalRulesCount={totalRulesCount}
          pageSize={pageSize}
          selectedRules={selectedRules}
          refetchStatus={refetchStatus}
          allRules={allRules}
          setSelectedRules={setSelectedRules}
          setSelectAllRules={setSelectAllRules}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={0}>
        <EuiFlexGroup gutterSize="none" direction="row">
          <EuiFlexItem
            css={css`
              min-width: 160px;
            `}
          >
            <EuiComboBox
              fullWidth={true}
              placeholder={i18n.translate(
                'xpack.csp.rules.rulesTableHeader.sectionSelectPlaceholder',
                {
                  defaultMessage: 'CIS Section',
                }
              )}
              singleSelection={{ asPlainText: true }}
              options={sectionOptions}
              selectedOptions={selectedSection}
              onChange={(option) => {
                setSelectedSection(option);
                onSectionChange(option.length ? option[0].label : undefined);
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem
            css={css`
              min-width: 160px;
            `}
          >
            <EuiComboBox
              fullWidth={true}
              placeholder={i18n.translate(
                'xpack.csp.rules.rulesTableHeader.ruleNumberSelectPlaceholder',
                {
                  defaultMessage: 'Rule Number',
                }
              )}
              singleSelection={{ asPlainText: true }}
              options={ruleNumberOptions}
              selectedOptions={selectedRuleNumber}
              onChange={(option) => {
                setSelectedRuleNumber(option);
                onRuleNumberChange(option.length ? option[0].label : undefined);
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem
            css={css`
              min-width: 160px;
            `}
          >
            <EuiFilterGroup>
              <EuiFilterButton withNext hasActiveFilters={isOnFilterOn} onClick={toggleOnFilter}>
                <FormattedMessage
                  id="xpack.csp.rules.rulesTable.enabledRuleFilterButton"
                  defaultMessage="Enabled rule"
                />
                {/* Enabled rules */}
              </EuiFilterButton>
              <EuiFilterButton hasActiveFilters={isOffFilterOn} onClick={toggleOffFilter}>
                <FormattedMessage
                  id="xpack.csp.rules.rulesTable.disabledRuleFilterButton"
                  defaultMessage="Disabled rule"
                />
                {/* Disabled rules */}
              </EuiFilterButton>
            </EuiFilterGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const SEARCH_DEBOUNCE_MS = 300;

const SearchField = ({
  search,
  isSearching,
  searchValue,
  totalRulesCount,
  pageSize,
  selectedRules,
  refetchStatus,
  allRules,
  setSelectedRules,
  setSelectAllRules,
}: Pick<
  RulesTableToolbarProps,
  | 'isSearching'
  | 'searchValue'
  | 'search'
  | 'totalRulesCount'
  | 'pageSize'
  | 'selectedRules'
  | 'refetchStatus'
  | 'allRules'
  | 'setSelectedRules'
  | 'setSelectAllRules'
>) => {
  const [localValue, setLocalValue] = useState(searchValue);

  useDebounce(() => search(localValue), SEARCH_DEBOUNCE_MS, [localValue]);

  return (
    <div>
      <EuiFlexItem grow={true} style={{ alignItems: 'flex-end' }}>
        <EuiFieldSearch
          isLoading={isSearching}
          placeholder={i18n.translate('xpack.csp.rules.rulesTable.searchPlaceholder', {
            defaultMessage: 'Search by Rule Name',
          })}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          style={{ minWidth: 150 }}
          fullWidth
        />
      </EuiFlexItem>
      <CurrentPageOfTotal
        pageSize={pageSize}
        total={totalRulesCount}
        selectedRules={selectedRules}
        refetchStatus={refetchStatus}
        allRules={allRules}
        setSelectedRules={setSelectedRules}
        setSelectAllRules={setSelectAllRules}
      />
    </div>
  );
};

const CurrentPageOfTotal = ({
  pageSize,
  total,
  selectedRules,
  refetchStatus,
  allRules,
  setSelectedRules,
  setSelectAllRules,
}: RuleTableCount) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const onPopoverClick = () => {
    setIsPopoverOpen((e) => !e);
  };

  const postRequestChangeRulesStatus = useChangeCspRuleStatus();
  const closePopover = () => setIsPopoverOpen(false);
  const changeRulesStatus = async (status: 'mute' | 'unmute') => {
    const bulkSelectedRules = selectedRules.map((e) => ({
      benchmark_id: e?.metadata.benchmark.id,
      benchmark_version: e?.metadata.benchmark.version,
      rule_number: e?.metadata.benchmark.rule_number,
      rule_id: e?.metadata.id,
    }));
    await postRequestChangeRulesStatus(status, bulkSelectedRules);
    await refetchStatus();
    await closePopover();
  };
  const changeCspRuleStatusMute = async () => {
    changeRulesStatus('mute');
  };
  const changeCspRuleStatusUnmute = async () => {
    changeRulesStatus('unmute');
  };

  const popoverButton = (
    <EuiButtonEmpty
      onClick={onPopoverClick}
      size="xs"
      iconType="arrowDown"
      iconSide="right"
      css={css`
        padding-bottom: ${euiThemeVars.euiSizeS};
      `}
    >
      Bulk actions
    </EuiButtonEmpty>
  );
  const items = [
    <EuiContextMenuItem
      disabled={selectedRules.length === 0 ? true : false}
      onClick={changeCspRuleStatusMute}
    >
      <EuiText>
        <FormattedMessage id="xpack.csp.rules.rulesTable.optionEnable" defaultMessage="Enable" />
      </EuiText>
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      disabled={selectedRules.length === 0 ? true : false}
      onClick={changeCspRuleStatusUnmute}
    >
      <EuiText key="disabled">
        <FormattedMessage id="xpack.csp.rules.rulesTable.optionDisable" defaultMessage="Disable" />
      </EuiText>
    </EuiContextMenuItem>,
  ];
  return (
    <EuiFlexItem grow={false}>
      <EuiSpacer size="xl" />
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiText size="xs" textAlign="left" color="subdued" style={{ marginLeft: '8px' }}>
            <FormattedMessage
              id="xpack.csp.rules.rulesTable.showingPageOfTotalLabel"
              defaultMessage="Showing {pageSize} of {total, plural, one {# rule} other {# rules}} | Selected {selectedRulesAmount} rules"
              values={{ pageSize, total, selectedRulesAmount: selectedRules.length || 0 }}
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            onClick={setSelectAllRules}
            size="xs"
            iconType="editorChecklist"
            css={css`
              padding-bottom: ${euiThemeVars.euiSizeS};
            `}
          >
            <FormattedMessage
              id="xpack.csp.rules.rulesTable.selectAllRulesOption"
              defaultMessage="Select All Rules"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPopover
            button={popoverButton}
            isOpen={isPopoverOpen}
            closePopover={closePopover}
            anchorPosition="downLeft"
            panelPaddingSize="s"
          >
            <EuiPopoverTitle style={{ minWidth: 240 }}>
              <EuiText size="s" textAlign="left" color="subdued" style={{ marginLeft: '8px' }}>
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
