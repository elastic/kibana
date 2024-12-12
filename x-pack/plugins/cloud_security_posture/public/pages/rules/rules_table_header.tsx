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
import { MultiSelectFilter } from '../../common/component/multi_select_filter';
import { useRules } from './rules_context';

export const RULES_BULK_ACTION_BUTTON = 'bulk-action-button';
export const RULES_BULK_ACTION_OPTION_ENABLE = 'bulk-action-option-enable';
export const RULES_BULK_ACTION_OPTION_DISABLE = 'bulk-action-option-disable';
export const RULES_SELECT_ALL_RULES = 'select-all-rules-button';
export const RULES_CLEAR_ALL_RULES_SELECTION = 'clear-rules-selection-button';
export const RULES_DISABLED_FILTER = 'rules-disabled-filter';
export const RULES_ENABLED_FILTER = 'rules-enabled-filter';

export const RulesTableHeader = () => {
  const {
    section,
    setSection,
    ruleNumber,
    setRuleNumber,
    sectionSelectOptions,
    ruleNumberSelectOptions,
    setEnabledDisabledItemsFilter,
    enabledDisabledItemsFilter,
  } = useRules();
  const sectionOptions = sectionSelectOptions.map((option) => ({
    key: option,
    label: option,
  }));
  const ruleNumberOptions = ruleNumberSelectOptions.map((option) => ({
    key: option,
    label: option,
  }));

  const toggleEnabledRulesFilter = () => {
    if (enabledDisabledItemsFilter === 'enabled') setEnabledDisabledItemsFilter('no-filter');
    else setEnabledDisabledItemsFilter('enabled');
  };

  const toggleDisabledRulesFilter = () => {
    if (enabledDisabledItemsFilter === 'disabled') setEnabledDisabledItemsFilter('no-filter');
    else setEnabledDisabledItemsFilter('disabled');
  };

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexGroup wrap={true}>
        <EuiFlexItem grow={1}>
          <SearchField />
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
                onChange={(changedSections) => {
                  setSection(
                    changedSections?.selectedOptionKeys
                      ? changedSections?.selectedOptionKeys
                      : undefined
                  );
                }}
                options={sectionOptions}
                selectedOptionKeys={section}
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
                onChange={(changedRuleNumbers) => {
                  setRuleNumber(
                    changedRuleNumbers?.selectedOptionKeys
                      ? changedRuleNumbers?.selectedOptionKeys
                      : undefined
                  );
                }}
                options={ruleNumberOptions}
                selectedOptionKeys={ruleNumber}
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
                  hasActiveFilters={enabledDisabledItemsFilter === 'enabled'}
                  onClick={toggleEnabledRulesFilter}
                  data-test-subj={RULES_ENABLED_FILTER}
                >
                  <FormattedMessage
                    id="xpack.csp.rules.rulesTable.enabledRuleFilterButton"
                    defaultMessage="Enabled rules"
                  />
                </EuiFilterButton>
                <EuiFilterButton
                  hasActiveFilters={enabledDisabledItemsFilter === 'disabled'}
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
        <CurrentPageOfTotal />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const SEARCH_DEBOUNCE_MS = 300;

const SearchField = () => {
  const { search, setSearch, loading } = useRules();
  const [localValue, setLocalValue] = useState(search);

  useDebounce(() => setSearch(localValue), SEARCH_DEBOUNCE_MS, [localValue]);

  return (
    <div>
      <EuiFlexItem grow={true} style={{ alignItems: 'flex-end' }}>
        <EuiFieldSearch
          isLoading={loading}
          placeholder={i18n.translate('xpack.csp.rules.rulesTable.searchPlaceholder', {
            defaultMessage: 'Search by Rule Name',
          })}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          style={{ minWidth: 150 }}
          fullWidth
        />
      </EuiFlexItem>
    </div>
  );
};

const CurrentPageOfTotal = () => {
  const {
    selectedRules,
    setSelectedRules,
    rulesShown,
    total,
    setSelectAllRules,
    toggleSelectedRulesStates,
  } = useRules();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const onPopoverClick = () => {
    setIsPopoverOpen((e) => !e);
  };

  const changeCspRuleStateMute = () => {
    toggleSelectedRulesStates('mute');
  };
  const changeCspRuleStateUnmute = () => {
    toggleSelectedRulesStates('unmute');
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
          <EuiText size="xs" textAlign="left" color="subdued" style={{ marginLeft: '8px' }}>
            <FormattedMessage
              id="xpack.csp.rules.rulesTable.showingPageOfTotalLabel"
              defaultMessage="Showing {rulesShown} of {total, plural, one {# rule} other {# rules}} {pipe} Selected {selectedRulesAmount, plural, one {# rule} other {# rules}}"
              values={{
                rulesShown,
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
