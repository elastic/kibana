/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { AlertExpressionPopover } from '../alert_expression_popover';
import * as labels from '../translations';
import { AlertFieldNumber } from '../alert_field_number';

interface Props {
  isEnabled?: boolean;
  defaultNumTimes?: number;
  hasFilters: boolean;
  setRuleParams: (key: string, value: any) => void;
}

export const DownNoExpressionSelect: React.FC<Props> = ({
  defaultNumTimes,
  hasFilters,
  isEnabled,
  setRuleParams,
}) => {
  const [numTimes, setNumTimes] = useState<number>(defaultNumTimes ?? 5);

  useEffect(() => {
    setRuleParams('numTimes', numTimes);
  }, [numTimes, setRuleParams]);

  return (
    <AlertExpressionPopover
      aria-label={labels.OPEN_THE_POPOVER_DOWN_COUNT}
      content={
        <AlertFieldNumber
          aria-label={labels.ENTER_NUMBER_OF_DOWN_COUNTS}
          data-test-subj="xpack.uptime.alerts.monitorStatus.numTimesField"
          disabled={false}
          fieldValue={numTimes}
          setFieldValue={setNumTimes}
        />
      }
      data-test-subj="xpack.uptime.alerts.monitorStatus.numTimesExpression"
      description={hasFilters ? labels.MATCHING_MONITORS_DOWN : labels.ANY_MONITOR_DOWN}
      id="ping-count"
      isEnabled={isEnabled}
      value={`${numTimes} times`}
    />
  );
};
