/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { MultiselectFilter } from '../multiselect_filter';
import type { RuleRunType } from '../../../../../../../common/api/detection_engine/rule_monitoring';
import { RuleRunTypeEnum } from '../../../../../../../common/api/detection_engine/rule_monitoring';
import * as i18n from './translations';
import {
  RULE_EXECUTION_TYPE_BACKFILL,
  RULE_EXECUTION_TYPE_STANDARD,
} from '../../../../../../common/translations';

interface ExecutionRunTypeFilterProps {
  items: RuleRunType[];
  selectedItems: RuleRunType[];
  onChange: (selectedItems: RuleRunType[]) => void;
}

const ExecutionRunTypeFilterComponent: React.FC<ExecutionRunTypeFilterProps> = ({
  items,
  selectedItems,
  onChange,
}) => {
  const renderItem = useCallback((item: RuleRunType) => {
    if (item === RuleRunTypeEnum.backfill) {
      return RULE_EXECUTION_TYPE_BACKFILL;
    } else if (item === RuleRunTypeEnum.standard) {
      return RULE_EXECUTION_TYPE_STANDARD;
    } else {
      return '-';
    }
  }, []);

  return (
    <MultiselectFilter<RuleRunType>
      dataTestSubj="ExecutionRunTypeFilter"
      title={i18n.FILTER_TITLE}
      items={items}
      selectedItems={selectedItems}
      onSelectionChange={onChange}
      renderItem={renderItem}
    />
  );
};

export const ExecutionRunTypeFilter = React.memo(ExecutionRunTypeFilterComponent);
ExecutionRunTypeFilter.displayName = 'ExecutionRunTypeFilter';
