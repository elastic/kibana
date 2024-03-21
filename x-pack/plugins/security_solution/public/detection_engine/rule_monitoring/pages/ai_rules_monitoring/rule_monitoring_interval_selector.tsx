/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { OnTimeChangeProps } from '@elastic/eui';
import { EuiSuperDatePicker } from '@elastic/eui';
import { useAiRulesMonitoringContext } from './ai_rules_monitoring_context';

export function RuleMonitoringIntervalSelector(): JSX.Element {
  const { isFetching, analyzedDateRange, setAnalyzedDateRange } = useAiRulesMonitoringContext();

  const onTimeChange = useCallback(
    ({ start: newStart, end: newEnd }: OnTimeChangeProps) => {
      setAnalyzedDateRange({ start: newStart, end: newEnd });
    },
    [setAnalyzedDateRange]
  );

  return (
    <EuiSuperDatePicker
      isLoading={isFetching}
      start={analyzedDateRange.start}
      end={analyzedDateRange.end}
      onTimeChange={onTimeChange}
      showUpdateButton={false}
    />
  );
}
