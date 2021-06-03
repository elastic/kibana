/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFilterButton, EuiFilterGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { GroupByOption } from '../../types';

const LocalizedOptions: { [option: string]: string } = {
  message: i18n.translate('xpack.upgradeAssistant.checkupTab.controls.groupByBar.byIssueLabel', {
    defaultMessage: 'By issue',
  }),
  index: i18n.translate('xpack.upgradeAssistant.checkupTab.controls.groupByBar.byIndexLabel', {
    defaultMessage: 'By index',
  }),
};

interface GroupByFilterProps {
  availableGroupByOptions: GroupByOption[];
  currentGroupBy: GroupByOption;
  onGroupByChange: (groupBy: GroupByOption) => void;
}

export const GroupByFilter: React.FunctionComponent<GroupByFilterProps> = ({
  availableGroupByOptions,
  currentGroupBy,
  onGroupByChange,
}) => {
  if (availableGroupByOptions.length <= 1) {
    return null;
  }

  return (
    <EuiFlexItem grow={false}>
      <EuiFilterGroup>
        {availableGroupByOptions.map((option) => (
          <EuiFilterButton
            key={option}
            onClick={onGroupByChange.bind(null, option)}
            hasActiveFilters={currentGroupBy === option}
          >
            {LocalizedOptions[option]}
          </EuiFilterButton>
        ))}
      </EuiFilterGroup>
    </EuiFlexItem>
  );
};
