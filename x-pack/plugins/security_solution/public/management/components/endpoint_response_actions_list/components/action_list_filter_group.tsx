/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFilterGroup } from '@elastic/eui';
import type { ResponseActions } from '../../../../../common/endpoint/types';
import { ActionListFilterButton } from './action_list_filter_button';

export const ActionListFilterGroup = memo(
  ({
    filters,
    onChangeCommand,
  }: {
    filters: Array<{
      filterName: string;
      filterItems: ResponseActions[];
    }>;
    onChangeCommand: (selectedCommands: ResponseActions[]) => void;
  }) => {
    return (
      <EuiFilterGroup>
        {filters.map((filter, i) => (
          <ActionListFilterButton key={i} {...filter} onChangeCommand={onChangeCommand} />
        ))}
      </EuiFilterGroup>
    );
  }
);

ActionListFilterGroup.displayName = 'ActionListFilterGroup';
