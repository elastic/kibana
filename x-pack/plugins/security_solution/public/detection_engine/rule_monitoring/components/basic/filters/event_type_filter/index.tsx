/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';

import type { RuleExecutionEventType } from '../../../../../../../common/detection_engine/rule_monitoring';
import { RULE_EXECUTION_EVENT_TYPES } from '../../../../../../../common/detection_engine/rule_monitoring';
import { EventTypeIndicator } from '../../indicators/event_type_indicator';
import { MultiselectFilter } from '../multiselect_filter';

import * as i18n from './translations';

interface EventTypeFilterProps {
  selectedItems: RuleExecutionEventType[];
  onChange: (selectedItems: RuleExecutionEventType[]) => void;
}

const EventTypeFilterComponent: React.FC<EventTypeFilterProps> = ({ selectedItems, onChange }) => {
  const renderItem = useCallback((item: RuleExecutionEventType) => {
    return <EventTypeIndicator type={item} />;
  }, []);

  return (
    <MultiselectFilter<RuleExecutionEventType>
      dataTestSubj="eventTypeFilter"
      title={i18n.FILTER_TITLE}
      items={RULE_EXECUTION_EVENT_TYPES}
      selectedItems={selectedItems}
      onSelectionChange={onChange}
      renderItem={renderItem}
    />
  );
};

export const EventTypeFilter = React.memo(EventTypeFilterComponent);
EventTypeFilter.displayName = 'EventTypeFilter';
