/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import {
  EuiFieldSearch,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import useDebounce from 'react-use/lib/useDebounce';
import moment from 'moment';
import * as TEST_SUBJECTS from './test_subjects';
import * as TEXT from './translations';
import { RulesBulkActionsMenu } from './rules_bulk_actions_menu';

interface RulesTableToolbarProps {
  search(value: string): void;
  refresh(): void;
  bulkEnable(): void;
  bulkDisable(): void;
  selectAll(): void;
  clearSelection(): void;
  totalRulesCount: number;
  selectedRulesCount: number;
  searchValue: string;
  isSearching: boolean;
  lastModified: string | null;
}

interface CounterProps {
  count: number;
}

interface ButtonProps {
  onClick(): void;
}

const LastModificationLabel = ({ lastModified }: { lastModified: string }) => (
  <EuiText size="s">
    <FormattedMessage
      id="xpack.csp.rules.tableHeader.lastModificationLabel"
      defaultMessage="Last modification to integration {timeAgo} "
      values={{ timeAgo: moment(lastModified).fromNow() }}
    />
  </EuiText>
);

export const RulesTableHeader = ({
  search,
  refresh,
  bulkEnable,
  bulkDisable,
  selectAll,
  clearSelection,
  totalRulesCount,
  selectedRulesCount,
  searchValue,
  isSearching,
  lastModified,
}: RulesTableToolbarProps) => (
  <div>
    {lastModified && <LastModificationLabel lastModified={lastModified} />}
    <EuiSpacer />
    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false} wrap>
      <Counters total={totalRulesCount} selected={selectedRulesCount} />
      <SelectAllToggle
        isSelectAll={selectedRulesCount === totalRulesCount}
        clear={clearSelection}
        select={selectAll}
      />
      <BulkMenu
        bulkEnable={bulkEnable}
        bulkDisable={bulkDisable}
        selectedRulesCount={selectedRulesCount}
      />
      <RefreshButton onClick={refresh} />
      <SearchField isSearching={isSearching} searchValue={searchValue} search={search} />
    </EuiFlexGroup>
  </div>
);

const Counters = ({ total, selected }: { total: number; selected: number }) => (
  <EuiFlexItem grow={false} style={{ flexDirection: 'row', fontVariantNumeric: 'tabular-nums' }}>
    <TotalRulesCount count={total} />
    {Spacer}
    <SelectedRulesCount count={selected} />
  </EuiFlexItem>
);

const SelectAllToggle = ({
  isSelectAll,
  select,
  clear,
}: {
  select(): void;
  clear(): void;
  isSelectAll: boolean;
}) => (
  <EuiFlexItem grow={false}>
    {isSelectAll ? <ClearSelectionButton onClick={clear} /> : <SelectAllButton onClick={select} />}
  </EuiFlexItem>
);

const BulkMenu = ({
  bulkEnable,
  bulkDisable,
  selectedRulesCount,
}: Pick<RulesTableToolbarProps, 'bulkDisable' | 'bulkEnable' | 'selectedRulesCount'>) => (
  <EuiFlexItem grow={false}>
    <RulesBulkActionsMenu
      items={[
        {
          icon: 'eye',
          disabled: !selectedRulesCount,
          children: <ActivateRulesMenuItemText count={selectedRulesCount} />,
          'data-test-subj': TEST_SUBJECTS.CSP_RULES_TABLE_BULK_ENABLE_BUTTON,
          onClick: bulkEnable,
        },
        {
          icon: 'eyeClosed',
          disabled: !selectedRulesCount,
          children: <DeactivateRulesMenuItemText count={selectedRulesCount} />,
          'data-test-subj': TEST_SUBJECTS.CSP_RULES_TABLE_BULK_DISABLE_BUTTON,
          onClick: bulkDisable,
        },
      ]}
    />
  </EuiFlexItem>
);

const SEARCH_DEBOUNCE_MS = 300;

const SearchField = ({
  search,
  isSearching,
  searchValue,
}: Pick<RulesTableToolbarProps, 'isSearching' | 'searchValue' | 'search'>) => {
  const [localValue, setLocalValue] = useState(searchValue);

  useDebounce(() => search(localValue), SEARCH_DEBOUNCE_MS, [localValue]);

  return (
    <EuiFlexItem grow={true} style={{ alignItems: 'flex-end' }}>
      <EuiFieldSearch
        isLoading={isSearching}
        placeholder={TEXT.SEARCH}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        style={{ minWidth: 150 }}
      />
    </EuiFlexItem>
  );
};

const TotalRulesCount = ({ count }: CounterProps) => (
  <FormattedMessage
    id="xpack.csp.rules.header.totalRulesCount"
    defaultMessage="Showing {rules}"
    values={{ rules: <RulesCountBold count={count} /> }}
  />
);

const SelectedRulesCount = ({ count }: CounterProps) => (
  <FormattedMessage
    id="xpack.csp.rules.header.selectedRulesCount"
    defaultMessage="Selected {rules}"
    values={{ rules: <RulesCountBold count={count} /> }}
  />
);

const ActivateRulesMenuItemText = ({ count }: CounterProps) => (
  <FormattedMessage
    id="xpack.csp.rules.activateAllButtonLabel"
    defaultMessage="Activate {count, plural, one {# rule} other {# rules}}"
    values={{ count }}
  />
);

const DeactivateRulesMenuItemText = ({ count }: CounterProps) => (
  <FormattedMessage
    id="xpack.csp.rules.deactivateAllButtonLabel"
    defaultMessage="Deactivate {count, plural, one {# rule} other {# rules}}"
    values={{ count }}
  />
);

const RulesCountBold = ({ count }: CounterProps) => (
  <>
    <strong style={{ margin: '0 4px' }}>{count}</strong>
    <FormattedMessage
      id="xpack.csp.rules.header.rulesCountLabel"
      defaultMessage="{count, plural, one { rule} other { rules}}"
      values={{ count }}
    />
  </>
);

const ClearSelectionButton = ({ onClick }: ButtonProps) => (
  <EuiButtonEmpty
    onClick={onClick}
    iconType={'cross'}
    data-test-subj={TEST_SUBJECTS.CSP_RULES_TABLE_CLEAR_SELECTION_BUTTON}
  >
    <FormattedMessage
      id="xpack.csp.rules.clearSelectionButtonLabel"
      defaultMessage="Clear Selection"
    />
  </EuiButtonEmpty>
);

const SelectAllButton = ({ onClick }: ButtonProps) => (
  <EuiButtonEmpty
    onClick={onClick}
    iconType={'pagesSelect'}
    data-test-subj={TEST_SUBJECTS.CSP_RULES_TABLE_SELECT_ALL_BUTTON}
  >
    <FormattedMessage id="xpack.csp.rules.selectAllButtonLabel" defaultMessage="Select All" />
  </EuiButtonEmpty>
);

const RefreshButton = ({ onClick }: ButtonProps) => (
  <EuiFlexItem grow={false}>
    <EuiButtonEmpty
      onClick={onClick}
      iconType={'refresh'}
      data-test-subj={TEST_SUBJECTS.CSP_RULES_TABLE_REFRESH_BUTTON}
    >
      {TEXT.REFRESH}
    </EuiButtonEmpty>
  </EuiFlexItem>
);

const Spacer = (
  <span
    css={css`
      border-right: 1px solid;
      margin: 0px 8px;
    `}
  />
);
