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
import { useChangeCspRuleStatus } from './change_csp_rule_status';
import { CspBenchmarkRulesWithStatus } from './rules_container';

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
  selectedRules: CspBenchmarkRulesWithStatus[];
  refetchStatus: () => void;
  setEnabledDisabledItemsFilter: (filterState: string) => void;
  currentEnabledDisabledItemsFilterState: string;
  setSelectAllRules: () => void;
  setSelectedRules: (rules: CspBenchmarkRulesWithStatus[]) => void;
}

interface RuleTableCount {
  pageSize: number;
  total: number;
  selectedRules: CspBenchmarkRulesWithStatus[];
  refetchStatus: () => void;
  setSelectAllRules: () => void;
  setSelectedRules: (rules: CspBenchmarkRulesWithStatus[]) => void;
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
  setSelectAllRules,
  setSelectedRules,
}: RulesTableToolbarProps) => {
  const [selectedSection, setSelectedSection] = useState<EuiComboBoxOptionOption[]>([]);
  const [selectedRuleNumber, setSelectedRuleNumber] = useState<EuiComboBoxOptionOption[]>([]);
  const sectionOptions = sectionSelectOptions.map((option) => ({
    label: option,
  }));

  const ruleNumberOptions = ruleNumberSelectOptions.map((option) => ({
    label: option,
  }));

  const [isEnabledRulesFilterOn, setIsEnabledRulesFilterOn] = useState(false);
  const [isDisabledRulesFilterOn, setisDisabledRulesFilterOn] = useState(false);

  const toggleEnabledRulesFilter = () => {
    setIsEnabledRulesFilterOn(!isEnabledRulesFilterOn);
    setisDisabledRulesFilterOn(
      isDisabledRulesFilterOn && !isEnabledRulesFilterOn ? false : isDisabledRulesFilterOn
    );
    if (currentEnabledDisabledItemsFilterState === 'enabled')
      setEnabledDisabledItemsFilter('no-filter');
    else setEnabledDisabledItemsFilter('enabled');
  };

  const toggleDisabledRulesFilter = () => {
    setisDisabledRulesFilterOn(!isDisabledRulesFilterOn);
    setIsEnabledRulesFilterOn(
      isEnabledRulesFilterOn && !isDisabledRulesFilterOn ? false : isEnabledRulesFilterOn
    );
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
          setSelectAllRules={setSelectAllRules}
          setSelectedRules={setSelectedRules}
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
              <EuiFilterButton
                withNext
                hasActiveFilters={isEnabledRulesFilterOn}
                onClick={toggleEnabledRulesFilter}
              >
                <FormattedMessage
                  id="xpack.csp.rules.rulesTable.enabledRuleFilterButton"
                  defaultMessage="Enabled rule"
                />
              </EuiFilterButton>
              <EuiFilterButton
                hasActiveFilters={isDisabledRulesFilterOn}
                onClick={toggleDisabledRulesFilter}
              >
                <FormattedMessage
                  id="xpack.csp.rules.rulesTable.disabledRuleFilterButton"
                  defaultMessage="Disabled rule"
                />
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
  setSelectAllRules,
  setSelectedRules,
}: Pick<
  RulesTableToolbarProps,
  | 'isSearching'
  | 'searchValue'
  | 'search'
  | 'totalRulesCount'
  | 'pageSize'
  | 'selectedRules'
  | 'refetchStatus'
  | 'setSelectAllRules'
  | 'setSelectedRules'
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
        setSelectAllRules={setSelectAllRules}
        setSelectedRules={setSelectedRules}
      />
    </div>
  );
};

const CurrentPageOfTotal = ({
  pageSize,
  total,
  selectedRules,
  refetchStatus,
  setSelectAllRules,
  setSelectedRules,
}: RuleTableCount) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const onPopoverClick = () => {
    setIsPopoverOpen((e) => !e);
  };

  const postRequestChangeRulesStatus = useChangeCspRuleStatus();
  const closePopover = () => setIsPopoverOpen(false);
  const changeRulesStatus = async (status: 'mute' | 'unmute') => {
    const bulkSelectedRules = selectedRules.map((e: CspBenchmarkRulesWithStatus) => ({
      benchmark_id: e?.metadata?.benchmark.id,
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
    // setSelectedRules([]);
  };
  const changeCspRuleStatusUnmute = async () => {
    changeRulesStatus('unmute');
    // setSelectedRules([]);
  };
  const areAllSelectedRulesMuted = selectedRules.find((e) => e?.status === 'muted');
  const areAllSelectedRulesUnmuted = selectedRules.find((e) => e?.status === 'unmuted');

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
      disabled={selectedRules.length === 0 || !areAllSelectedRulesUnmuted ? true : false}
      onClick={changeCspRuleStatusMute}
    >
      <EuiText>
        <FormattedMessage id="xpack.csp.rules.rulesTable.optionEnable" defaultMessage="Enable" />
      </EuiText>
    </EuiContextMenuItem>,
    <EuiContextMenuItem
      disabled={selectedRules.length === 0 || !areAllSelectedRulesMuted ? true : false}
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
              defaultMessage="Showing {pageSize} of {total, plural, one {# rule} other {# rules}} \u2000|\u2000 Selected {selectedRulesAmount, plural, one {# rule} other {# rules}}"
              values={{ pageSize, total, selectedRulesAmount: selectedRules.length || 0 }}
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            onClick={setSelectAllRules}
            size="xs"
            iconType="pagesSelect"
            css={css`
              padding-bottom: ${euiThemeVars.euiSizeS};
            `}
          >
            <FormattedMessage
              id="xpack.csp.rules.rulesTable.selectAllRulesOption"
              defaultMessage="Select All {total, plural, one {# rule} other {# rules}}"
              values={{ total }}
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
