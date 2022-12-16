/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';

import type { LogLevel } from '../../../../../../../common/detection_engine/rule_monitoring';
import { LOG_LEVELS } from '../../../../../../../common/detection_engine/rule_monitoring';
import { LogLevelIndicator } from '../../indicators/log_level_indicator';
import { MultiselectFilter } from '../multiselect_filter';

import * as i18n from './translations';

interface LogLevelFilterProps {
  selectedItems: LogLevel[];
  onChange: (selectedItems: LogLevel[]) => void;
}

const LogLevelFilterComponent: React.FC<LogLevelFilterProps> = ({ selectedItems, onChange }) => {
  const renderItem = useCallback((item: LogLevel) => {
    return <LogLevelIndicator logLevel={item} />;
  }, []);

  return (
    <MultiselectFilter<LogLevel>
      dataTestSubj="logLevelFilter"
      title={i18n.FILTER_TITLE}
      items={LOG_LEVELS}
      selectedItems={selectedItems}
      onSelectionChange={onChange}
      renderItem={renderItem}
    />
  );
};

export const LogLevelFilter = React.memo(LogLevelFilterComponent);
LogLevelFilter.displayName = 'LogLevelFilter';
