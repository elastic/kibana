/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiIcon,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  EuiSkeletonText,
} from '@elastic/eui';
import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import * as i18n from './translations';
import { useFindRules } from '../../../rule_management/logic/use_find_rules';
import type { Rule } from '../../../rule_management/logic/types';

const TAGS_POPOVER_WIDTH = 374;

interface Props {
  ruleId?: string;
  ruleType?: Type;
  copyConfigurations: (rule: Rule) => void;
}

/**
 * Popover for selecting the rule to copy configurations from
 *
 * @param onSelectedTagsChanged change listener to be notified when tag selection changes
 */
const CopyRuleConfigurationsPopoverComponent = ({
  ruleId,
  ruleType,
  copyConfigurations,
}: Props) => {
  const { data: { rules } = { rules: [], total: 0 }, isFetched } = useFindRules({
    filterOptions: {
      filter: '',
      showCustomRules: false,
      showElasticRules: false,
      tags: [],
    },
    sortingOptions: undefined,
    pagination: {
      page: 1,
      perPage: 10000,
    },
  });

  const selectableOptions = useMemo(() => {
    const filteredRules = rules.filter((rule) => !ruleType || rule.type === ruleType);
    return filteredRules.map(
      (rule) =>
        ({
          label: rule.name,
          data: rule,
          append: rule.id === ruleId && <EuiIcon type="refresh" size="s" />,
        } as EuiSelectableOption)
    );
  }, [ruleId, ruleType, rules]);

  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);

  const handleSelectableOptionsChange = (
    _: EuiSelectableOption[],
    __: unknown,
    changedOption: EuiSelectableOption
  ) => {
    copyConfigurations(changedOption.data as Rule);
    setIsTagPopoverOpen(false);
  };

  const triggerButton = (
    <EuiButtonEmpty
      data-test-subj="copy-rule-configurations"
      iconType="copy"
      size="xs"
      onClick={() => setIsTagPopoverOpen(!isTagPopoverOpen)}
    >
      {i18n.COPY_CONFIGURATIONS}
    </EuiButtonEmpty>
  );

  return (
    <EuiPopover
      ownFocus
      button={triggerButton}
      isOpen={isTagPopoverOpen}
      closePopover={() => setIsTagPopoverOpen(!isTagPopoverOpen)}
      panelPaddingSize="none"
      repositionOnScroll
      panelProps={{
        'data-test-subj': 'tags-filter-popover',
      }}
    >
      {!isFetched ? (
        <EuiSkeletonText
          lines={4}
          data-test-subj="copyRuleConfigurationsItemViewerEmptyPromptsLoading"
        />
      ) : (
        <EuiSelectable
          searchable
          searchProps={{
            placeholder: i18n.SEARCH_RULE,
          }}
          aria-label={i18n.SEARCH_RULE}
          options={selectableOptions}
          onChange={handleSelectableOptionsChange}
          emptyMessage={i18n.NO_RULES}
          noMatchesMessage={i18n.NO_RULES}
        >
          {(list, search) => (
            <div style={{ width: TAGS_POPOVER_WIDTH }}>
              <EuiPopoverTitle>{search}</EuiPopoverTitle>
              {list}
            </div>
          )}
        </EuiSelectable>
      )}
    </EuiPopover>
  );
};

CopyRuleConfigurationsPopoverComponent.displayName = 'CopyRuleConfigurationsPopoverComponent';

export const CopyRuleConfigurationsPopover = React.memo(CopyRuleConfigurationsPopoverComponent);

CopyRuleConfigurationsPopover.displayName = 'CopyRuleConfigurationsPopover';
