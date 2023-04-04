/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldSearch,
  EuiIcon,
  EuiPopover,
  EuiSuggest,
  EuiSwitch,
} from '@elastic/eui';
import React, { useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { QueryStringInput } from '@kbn/unified-search-plugin/public';
import { useCreateDataView } from '../hooks/use_create_data_view';
import { RulesListFilters, RuleTableItem } from '@kbn/triggers-actions-ui-plugin/public/types';
import { useGetRuleParamsFromRuleItems } from '../hooks/use_get_rule_params_from_rule_items';

interface Props {
  inputText: string;
  showRuleParamFilter: boolean;

  filters: RulesListFilters;
  items: RuleTableItem[];
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onChangeRuleParams: (filters: Record<string, string>) => void;
  onKeyUp: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

type InputMode = 'text' | 'kql';

interface SuggestionItem {
  type: { iconType: string; color: string };
  label: string;
  value: string | number;
  category: string;
  itemType: 'key' | 'value';
}
export function RulesListSearchFilter({
  filters,
  inputText,
  items,
  showRuleParamFilter,
  onChangeRuleParams,
  onChange,
  onKeyUp,
}: Props) {
  const ref = useRef<HTMLInputElement | undefined>(undefined);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>('text');

  const [kqlQuery, setKqlQuery] = useState('');

  const ruleParams = useGetRuleParamsFromRuleItems({ ruleItems: items });

  const handleSelectInputModeClick = () => {
    setIsPopoverOpen(!isPopoverOpen);
  };

  const handleInputChange = (bla: any, filteredThings: any) => {
    setKqlQuery(bla);

    if (bla === '') {
      onChangeRuleParams({ ...filters, params: {} });
    }
  };

  const onItemClick = (item: SuggestionItem) => {
    const newQuery = item.itemType === 'key' ? `${item.value}: ` : `${item.value}; `;
    const foo = `${kqlQuery}${newQuery}`;
    setKqlQuery(foo);

    const newFilters = foo.split(';').reduce((acc, curr) => {
      const [key, val] = curr.split(':');

      if (!key.trim() || !val.trim()) {
        return acc;
      }

      acc[key] = val.trim();

      return acc;
    }, {} as Record<string, string>);

    console.log('newFilters', newFilters);

    if (Object.keys(newFilters).length) {
      onChangeRuleParams({ ...filters, params: newFilters });
    }
  };

  const handelInputModeSwitch = () => {
    setInputMode(inputMode === 'kql' ? 'text' : 'kql');
    setIsPopoverOpen(false);
  };

  const ModeSelector = (
    <EuiPopover
      button={
        <EuiButtonEmpty
          role="button"
          size="xs"
          iconType="arrowDown"
          iconSide="right"
          aria-label="Calendar dropdown"
          onClick={handleSelectInputModeClick}
        >
          <EuiIcon type="kqlSelector" />
        </EuiButtonEmpty>
      }
      isOpen={isPopoverOpen}
    >
      <EuiSwitch label="KQL" checked={inputMode === 'kql'} onChange={handelInputModeSwitch} />
    </EuiPopover>
  );

  console.log('ruleParams', ruleParams);

  const suggestions: SuggestionItem[] = Object.keys(ruleParams)
    .map((item) => ({
      type: { iconType: 'kqlField', color: 'tint4' },
      label: item,
      value: item,
      category: item,
      itemType: 'key' as const,
    }))
    .concat(
      Object.keys(ruleParams).reduce((acc, item) => {
        return acc.concat(
          ruleParams[item].map(({ label, value }) => ({
            type: { iconType: 'kqlValue', color: 'tint0' },
            label,
            value,
            category: item,
            itemType: 'value' as const,
          }))
        );
      }, [] as Array<SuggestionItem>)
    )
    .filter((bla) => {
      if (kqlQuery.includes(';')) {
        return true;
      }
      return kqlQuery
        ? bla.category
            .toLowerCase()
            .includes(kqlQuery.toLowerCase().replace('; ', '').replace(': ', ''))
        : true;
    });

  return inputMode === 'text' ? (
    <EuiFieldSearch
      fullWidth
      isClearable
      data-test-subj="ruleSearchField"
      value={inputText}
      prepend={ModeSelector}
      onChange={onChange}
      onKeyUp={onKeyUp}
      placeholder={i18n.translate(
        'xpack.triggersActionsUI.sections.rulesList.searchPlaceholderTitle',
        { defaultMessage: 'Search' }
      )}
    />
  ) : (
    <EuiSuggest
      aria-label="bla"
      prepend={ModeSelector}
      tooltipContent={'poop'}
      onChange={handleInputChange}
      onItemClick={onItemClick}
      isClearable
      value={kqlQuery}
      isPreFiltered
      inputRef={() => ref}
      suggestions={suggestions}

      //   [
      //     {
      //       type: { iconType: 'kqlField', color: 'tint4' },
      //       label: 'Field sample',
      //       description: 'This is the description',
      //     },
      //     {
      //       type: { iconType: 'kqlValue', color: 'tint0' },
      //       label: 'Value sample',
      //       description: 'This is the description',
      //     },
      //   ]}
    />
    // <QueryStringInput
    //   appName="Observability"
    //   bubbleSubmitEvent={false}
    //   deps={{
    //     data,
    //     dataViews,
    //     docLinks,
    //     http,
    //     notifications,
    //     storage,
    //     uiSettings,
    //     unifiedSearch,
    //   }}
    //   prepend={ModeSelector}
    //   disableAutoFocus
    //   disableLanguageSwitcher
    //   indexPatterns={dataView ? [dataView] : []}
    //   languageSwitcherPopoverAnchorPosition="rightDown"
    //   placeholder={i18n.translate(
    //     'xpack.triggersActionsUI.sections.rulesList.queryPlaceholderTitle',
    //     { defaultMessage: 'Search' }
    //   )}
    //   query={{ query: '123', language: 'kuery' }}
    //   size="s"
    //   //   onChange={(value) => {
    //   //     field.onChange(value.query);
    //   //   }}
    // />
  );
}
