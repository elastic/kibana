/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';

import type { RuleExecutionStatus } from '../../../../../../../common/detection_engine/rule_monitoring';
import { ExecutionStatusIndicator } from '../../indicators/execution_status_indicator';
import { MultiselectFilter } from '../multiselect_filter';

import * as i18n from './translations';

interface ExecutionStatusFilterProps {
  items: RuleExecutionStatus[];
  selectedItems: RuleExecutionStatus[];
  onChange: (selectedItems: RuleExecutionStatus[]) => void;
}

const ExecutionStatusFilterComponent: React.FC<ExecutionStatusFilterProps> = ({
  items,
  selectedItems,
  onChange,
}) => {
  const renderItem = useCallback((item: RuleExecutionStatus) => {
    return <ExecutionStatusIndicator status={item} />;
  }, []);

  return (
    <MultiselectFilter<RuleExecutionStatus>
      dataTestSubj="ExecutionStatusFilter"
      title={i18n.FILTER_TITLE}
      items={items}
      selectedItems={selectedItems}
      onSelectionChange={onChange}
      renderItem={renderItem}
    />
  );
};

export const ExecutionStatusFilter = React.memo(ExecutionStatusFilterComponent);
ExecutionStatusFilter.displayName = 'ExecutionStatusFilter';
