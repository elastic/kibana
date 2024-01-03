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
  EuiPanel,
  EuiAccordion,
  EuiPopover,
  EuiButtonEmpty,
} from '@elastic/eui';
import useDebounce from 'react-use/lib/useDebounce';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';

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
}

interface RuleTableCount {
  pageSize: number;
  total: number;
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
}: RulesTableToolbarProps) => {
  const [selectedSection, setSelectedSection] = useState<EuiComboBoxOptionOption[]>([]);
  const [selectedRuleNumber, setSelectedRuleNumber] = useState<EuiComboBoxOptionOption[]>([]);

  const sectionOptions = sectionSelectOptions.map((option) => ({
    label: option,
  }));

  const ruleNumberOptions = ruleNumberSelectOptions.map((option) => ({
    label: option,
  }));

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={1}>
        <SearchField
          isSearching={isSearching}
          searchValue={searchValue}
          search={search}
          totalRulesCount={totalRulesCount}
          pageSize={pageSize}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={0}>
        <EuiFlexGroup gutterSize="xs" direction="row">
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
}: Pick<
  RulesTableToolbarProps,
  'isSearching' | 'searchValue' | 'search' | 'totalRulesCount' | 'pageSize'
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
      <CurrentPageOfTotal pageSize={pageSize} total={totalRulesCount} />
    </div>
  );
};

const CurrentPageOfTotal = ({ pageSize, total }: RuleTableCount) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const onPopoverClick = () => {
    setIsPopoverOpen((e) => !e);
  };
  const closePopover = () => setIsPopoverOpen(false);
  const popoverButton = <EuiButtonEmpty onClick={onPopoverClick}>TEST BUTTON</EuiButtonEmpty>;
  return (
    <EuiFlexItem grow={false}>
      <EuiSpacer size="xl" />
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem>
          <EuiText size="xs" textAlign="left" color="subdued" style={{ marginLeft: '8px' }}>
            <FormattedMessage
              id="xpack.csp.rules.rulesTable.showingPageOfTotalLabel"
              defaultMessage="Showing {pageSize} of {total, plural, one {# rule} other {# rules}}"
              values={{ pageSize, total }}
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs" textAlign="left" color="subdued" style={{ marginLeft: '8px' }}>
            <FormattedMessage
              id="xpack.csp.rules.rulesTable.showingTotalSelectedRules"
              defaultMessage="PUT SELECTED RULES NUMBER HERE"
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs" textAlign="left" color="subdued" style={{ marginLeft: '8px' }}>
            <FormattedMessage
              id="xpack.csp.rules.rulesTable.selectAllRules"
              defaultMessage="PUT SELECT ALL RULES BUTTON HERE"
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          {/* <EuiText size="xs" textAlign="left" color="subdued" style={{ marginLeft: '8px' }}>
            <FormattedMessage
              id="xpack.csp.rules.rulesTable.bulkActionsPopover"
              defaultMessage="PUT BULK ACTIONS BUTTON HERE"
            />
          </EuiText> */}
          <EuiPopover
            button={popoverButton}
            isOpen={isPopoverOpen}
            closePopover={closePopover}
            anchorPosition="downCenter"
          >
            <EuiFlexGroup gutterSize="none" direction="column">
              <EuiFlexItem>
                <EuiButtonEmpty size="s" color="text" onClick={() => {}}>
                  Option A
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButtonEmpty size="s" color="text" onClick={() => {}}>
                  Option B
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPopover>
          {/* <EuiAccordion id="dropDown-bulkactions-id" buttonContent="Click me to togg">
            <EuiPanel color="subdued">
              Any content inside of <strong>EuiAccordion</strong> will appear here.
            </EuiPanel>
          </EuiAccordion> */}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
